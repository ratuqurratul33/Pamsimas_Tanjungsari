<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\StoreReceiptBatchRequest;
use App\Http\Resources\ReceiptResource;
use App\Models\MeterReading;
use App\Models\ReceiptBatch;
use App\Services\ReceiptBatchService;
use App\Support\RealtimeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReceiptController extends Controller
{
    public function __construct(private readonly ReceiptBatchService $receiptService) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'officer_id' => ['nullable', 'integer', 'exists:users,id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'period' => ['nullable', 'date_format:Y-m'],
            'status' => ['nullable', 'in:queued,printed,cancelled'],
        ]);
        $receipts = $this->receiptService->list($filters);

        return ReceiptResource::collection($receipts)
            ->additional([
                'summary' => [
                    ...$this->receiptService->summary($filters),
                ],
            ])
            ->response();
    }

    public function store(StoreReceiptBatchRequest $request): JsonResponse
    {
        $batch = $this->receiptService->createBatch($request->validated(), $request->user());
        RealtimeNotifier::updated(['receipts', 'field', 'dashboard'], 'admin.receipt_batch.printed');

        return response()->json([
            'data' => $this->batchPayload($batch),
            'message' => 'Batch kwitansi berhasil dibuat dan dicatat sebagai sudah dicetak.',
        ], 201);
    }

    public function showBatch(ReceiptBatch $batch): JsonResponse
    {
        return response()->json([
            'data' => $this->batchPayload($batch->load(['officer', 'printer', 'receipts.customer', 'receipts.bill.meterReading'])),
        ]);
    }

    public function downloadPdf(ReceiptBatch $batch): StreamedResponse|JsonResponse
    {
        // Served through this authenticated route (auth:sanctum + role:admin,
        // same as the rest of /admin) rather than a public storage URL —
        // batch_number is sequential and guessable, and the PDF carries
        // every receipt's name, address and billing amount for the batch.
        // See the comment in ReceiptPdfService::generateForBatch().
        if (! $batch->file_path || ! Storage::disk('local')->exists($batch->file_path)) {
            return response()->json(['message' => 'PDF kwitansi belum tersedia untuk batch ini.'], 404);
        }

        return Storage::disk('local')->response($batch->file_path, "{$batch->batch_number}.pdf", [
            'Content-Type' => 'application/pdf',
        ]);
    }

    public function regeneratePdf(ReceiptBatch $batch): JsonResponse
    {
        try {
            $batch = $this->receiptService->regeneratePdf($batch->load(['receipts.customer', 'receipts.bill.meterReading']));
        } catch (\Throwable $exception) {
            // Full detail (dompdf/Blade error, may include local paths) goes
            // to the log only — an admin's browser doesn't need that surface.
            report($exception);

            return response()->json(['message' => 'Gagal membuat PDF kwitansi. Coba lagi, atau hubungi teknis jika terus gagal.'], 500);
        }

        return response()->json([
            'data' => $this->batchPayload($batch->load(['officer', 'printer', 'receipts.customer', 'receipts.bill.meterReading'])),
            'message' => 'PDF kwitansi berhasil dibuat ulang.',
        ]);
    }

    public function updateMeterReading(Request $request, MeterReading $meterReading): JsonResponse
    {
        $validated = $request->validate([
            'current_meter' => ['required', 'integer', 'min:0'],
            'previous_meter' => ['required', 'integer', 'min:0'],
        ]);
        abort_if($validated['current_meter'] < $validated['previous_meter'], 422, 'Meter akhir tidak boleh lebih kecil dari meter awal.');
        $usage = $validated['current_meter'] - $validated['previous_meter'];

        DB::transaction(function () use ($meterReading, $validated, $usage) {
            $meterReading->update([...$validated, 'usage' => $usage]);
            $bill = $meterReading->bill;

            if (! $bill) {
                return;
            }

            $bill->update([
                'print_status' => 'belum_dicetak',
                'total_amount' => ($usage * (float) $bill->water_rate) + (float) $bill->admin_fee,
                'usage' => $usage,
            ]);

            // A correction after the kwitansi was already printed invalidates
            // the physical copy that was handed out — reset it to queued so
            // it shows as "Belum Dicetak" again and the corrected numbers can
            // be selected into a fresh print batch. queueForBill() below only
            // refreshes a receipt's snapshot when it's queued, so this must
            // happen before that call.
            $receipt = $bill->receipts()->first();
            if ($receipt && $receipt->status === 'printed') {
                $receipt->update([
                    'printed_at' => null,
                    'printed_by' => null,
                    'receipt_batch_id' => null,
                    'status' => 'queued',
                ]);
            }

            $this->receiptService->queueForBill($bill->fresh(['customer', 'meterReading.officer']));
        });

        RealtimeNotifier::updated(['receipts', 'field', 'dashboard', 'public-summary'], 'admin.meter_reading.updated');

        return response()->json(['data' => $meterReading->fresh(['bill.customer'])]);
    }

    private function batchPayload(ReceiptBatch $batch): array
    {
        return [
            'batch_number' => $batch->batch_number,
            'empty_slots' => $batch->empty_slots,
            'has_pdf' => (bool) $batch->file_path,
            'id' => $batch->id,
            'officer_id' => $batch->officer_id,
            'officer_name' => $batch->officer?->name,
            'page_count' => $batch->page_count,
            'period' => sprintf('%04d-%02d', $batch->period_year, $batch->period_month),
            'printed_at' => $batch->printed_at?->toIso8601String(),
            'printed_by' => $batch->printer?->only(['id', 'name']),
            'receipt_count' => $batch->receipt_count,
            'receipts' => ReceiptResource::collection($batch->receipts)->resolve(),
            'slots_per_page' => $batch->slots_per_page,
            'status' => $batch->status,
        ];
    }
}
