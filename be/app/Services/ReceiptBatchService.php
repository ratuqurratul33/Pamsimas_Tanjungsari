<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Bill;
use App\Models\Receipt;
use App\Models\ReceiptBatch;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReceiptBatchService
{
    public const SLOTS_PER_PAGE = 3;

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly ReceiptPdfService $pdfService,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        [$month, $year] = $this->resolvePeriod($filters['period'] ?? null);
        $this->ensureQueuedReceipts($month, $year, isset($filters['officer_id']) ? (int) $filters['officer_id'] : null);

        return Receipt::query()
            ->with(['bill.meterReading.officer', 'customer', 'officer', 'batch'])
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->when($filters['officer_id'] ?? null, fn ($query, $officerId) => $query->where('officer_id', $officerId))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->orderBy(User::select('name')->whereColumn('users.id', 'receipts.officer_id'))
            ->orderBy('customer_name_snapshot')
            ->paginate(min((int) ($filters['per_page'] ?? 25), 100));
    }

    public function createBatch(array $payload, User $admin): ReceiptBatch
    {
        $batch = DB::transaction(function () use ($payload, $admin) {
            [$month, $year] = $this->resolvePeriod($payload['period']);
            $receipts = Receipt::query()
                ->with(['customer', 'officer', 'bill.meterReading'])
                ->whereIn('id', $payload['receipt_ids'])
                ->lockForUpdate()
                ->get();

            if ($receipts->count() !== count(array_unique($payload['receipt_ids']))) {
                throw new BusinessRuleException('Sebagian kwitansi tidak ditemukan.');
            }

            if ($receipts->contains(fn (Receipt $receipt) => $receipt->status !== 'queued')) {
                throw new BusinessRuleException('Kwitansi yang sudah dicetak atau dibatalkan tidak dapat masuk batch baru.');
            }

            if ($receipts->contains(fn (Receipt $receipt) => (int) $receipt->period_month !== $month || (int) $receipt->period_year !== $year)) {
                throw new BusinessRuleException('Semua kwitansi harus berada dalam periode batch yang sama.');
            }

            if ($receipts->contains(fn (Receipt $receipt) => (int) $receipt->officer_id !== (int) $payload['officer_id'])) {
                throw new BusinessRuleException('Semua kwitansi harus berasal dari petugas yang dipilih.');
            }

            if ($receipts->contains(fn (Receipt $receipt) => ! $receipt->bill?->meterReading)) {
                throw new BusinessRuleException('Kwitansi hanya dapat dicetak setelah input meter dan tagihan berhasil disimpan.');
            }

            if ($receipts->contains(fn (Receipt $receipt) => (int) $receipt->bill->meterReading->officer_id !== (int) $payload['officer_id'])) {
                throw new BusinessRuleException('Petugas pada input meter tidak sesuai dengan petugas batch kwitansi.');
            }

            $receiptCount = $receipts->count();
            $pageCount = (int) ceil($receiptCount / self::SLOTS_PER_PAGE);
            $emptySlots = ($pageCount * self::SLOTS_PER_PAGE) - $receiptCount;
            $batch = ReceiptBatch::create([
                'batch_number' => sprintf('BATCH-%04d-%02d-%06d', $year, $month, ReceiptBatch::query()->max('id') + 1),
                'empty_slots' => $emptySlots,
                'officer_id' => $payload['officer_id'],
                'page_count' => $pageCount,
                'period_month' => $month,
                'period_year' => $year,
                'printed_at' => now(),
                'printed_by' => $admin->id,
                'receipt_count' => $receiptCount,
                'slots_per_page' => self::SLOTS_PER_PAGE,
                'status' => 'printed',
            ]);

            foreach ($receipts as $receipt) {
                $receipt->update([
                    'printed_at' => now(),
                    'printed_by' => $admin->id,
                    'receipt_batch_id' => $batch->id,
                    'status' => 'printed',
                    'template_snapshot' => $this->snapshot($receipt),
                ]);
                $receipt->bill?->update(['print_status' => 'sudah_dicetak']);
            }

            $batch = $batch->load(['officer', 'printer', 'receipts.customer', 'receipts.bill.meterReading']);

            // dompdf renders in-process (no external binary to shell out to,
            // unlike the old LibreOffice pipeline this replaced), so it's
            // safe to render inside this same transaction. That matters:
            // if it fails, the whole print attempt rolls back and every
            // receipt stays 'queued' — retryable by simply printing again —
            // instead of being left marked 'printed' with no usable PDF,
            // which the "already printed" guard above would then block from
            // ever being re-batched.
            try {
                $batch->update(['file_path' => $this->pdfService->generateForBatch($batch)]);
            } catch (\Throwable $exception) {
                Log::error('Gagal membuat PDF kwitansi untuk batch '.$batch->batch_number.': '.$exception->getMessage());

                throw new BusinessRuleException('Gagal membuat PDF kwitansi. Coba lagi, atau hubungi teknis jika terus gagal.');
            }

            $this->auditLogger->write($admin, 'receipt.batch_printed', "Batch {$batch->batch_number} berisi {$receiptCount} kwitansi dicetak.");

            return $batch;
        });

        return $batch;
    }

    public function regeneratePdf(ReceiptBatch $batch): ReceiptBatch
    {
        $batch->update(['file_path' => $this->pdfService->generateForBatch($batch)]);

        return $batch;
    }

    public function ensureQueuedReceipts(int $month, int $year, ?int $officerId = null): void
    {
        $bills = Bill::query()
            ->with(['customer', 'meterReading.officer'])
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->whereNotNull('meter_reading_id')
            ->whereHas('customer', fn ($query) => $query->whereIn('status', ['aktif', 'menunggak']))
            ->whereHas('meterReading.officer', function ($query) use ($officerId) {
                $query->where('role', 'petugas')->where('status', 'aktif')
                    ->when($officerId, fn ($officerQuery) => $officerQuery->whereKey($officerId));
            })
            ->get();

        foreach ($bills as $bill) {
            $this->queueForBill($bill);
        }
    }

    public function queueForBill(Bill $bill): ?Receipt
    {
        $bill->loadMissing(['customer', 'meterReading.officer']);
        $customer = $bill->customer;
        $reading = $bill->meterReading;
        $officer = $reading?->officer;

        if (! $customer || ! in_array($customer->status, ['aktif', 'menunggak'], true) || ! $reading || ! $officer || $officer->role !== 'petugas' || $officer->status !== 'aktif') {
            return null;
        }

        $receiptNumber = sprintf('KWT-%04d%02d-%06d', $bill->period_year, $bill->period_month, $customer->id);
        $receipt = Receipt::query()->firstOrNew([
            'customer_id' => $customer->id,
            'period_month' => $bill->period_month,
            'period_year' => $bill->period_year,
        ]);

        if ($receipt->exists && $receipt->status !== 'queued') {
            return $receipt;
        }

        $receipt->fill([
            'bill_id' => $bill->id,
            'customer_address_snapshot' => $customer->address,
            'customer_name_snapshot' => $customer->name,
            'officer_id' => $officer->id,
            'receipt_number' => $receiptNumber,
            'status' => 'queued',
            'template_snapshot' => $this->templateData($bill, $receiptNumber),
        ])->save();

        return $receipt;
    }

    public function summary(array $filters): array
    {
        [$month, $year] = $this->resolvePeriod($filters['period'] ?? null);
        $query = Receipt::query()
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->when($filters['officer_id'] ?? null, fn ($receiptQuery, $officerId) => $receiptQuery->where('officer_id', $officerId));

        return [
            'printed' => (clone $query)->where('status', 'printed')->count(),
            'queued' => (clone $query)->where('status', 'queued')->count(),
            'slots_per_page' => self::SLOTS_PER_PAGE,
        ];
    }

    public function resolvePeriod(?string $period): array
    {
        if ($period && preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $period, $matches)) {
            return [(int) $matches[2], (int) $matches[1]];
        }

        $active = Setting::query()->where('key', 'billing_period')->value('value') ?? [];

        return [(int) ($active['month'] ?? now()->month), (int) ($active['year'] ?? now()->year)];
    }

    private function snapshot(Receipt $receipt): array
    {
        $receipt->loadMissing(['bill.meterReading', 'customer']);
        // Read the signatory from Settings at print time and freeze it into
        // this receipt's snapshot, same as every other templateData() field —
        // if the signatory changes later, already-printed receipts must keep
        // showing whoever signed them at the time, not the current one.
        $signatory = Setting::query()->where('key', 'receipt_signatory')->value('value') ?? [];

        return [
            ...$this->templateData($receipt->bill, $receipt->receipt_number),
            'signatory_name' => $signatory['name'] ?? 'ADE SOPIAN',
            'signatory_title' => $signatory['title'] ?? 'Ketua KPSPAMS TIRTA SARI',
            'template' => 'SATUAN KWITANSI PAMSISMAS TEMPLATE',
        ];
    }

    private function templateData(Bill $bill, string $receiptNumber): array
    {
        $bill->loadMissing(['customer', 'meterReading']);

        return [
            'address' => $bill->customer?->address,
            'admin_fee' => (int) round((float) $bill->admin_fee),
            'bill_amount' => (int) round((float) $bill->total_amount),
            'current_meter' => (int) $bill->meterReading->current_meter,
            'customer_name' => $bill->customer?->name,
            'invoice_number' => $bill->invoice_number,
            'month_label' => $this->monthLabel((int) $bill->period_month, (int) $bill->period_year),
            'previous_meter' => (int) $bill->meterReading->previous_meter,
            'receipt_number' => $receiptNumber,
            'usage' => (int) $bill->usage,
            'water_rate' => (int) round((float) $bill->water_rate),
        ];
    }

    private function monthLabel(int $month, int $year): string
    {
        $months = [1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'];

        return ($months[$month] ?? 'Bulan').' '.$year;
    }
}
