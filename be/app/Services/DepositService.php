<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\OfficerDeposit;
use App\Models\Payment;
use App\Models\User;
use App\Support\RealtimeNotifier;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class DepositService
{
    public function __construct(
        private readonly CashLedgerService $ledger,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function verify(OfficerDeposit $deposit, array $payload, User $admin): array
    {
        return DB::transaction(function () use ($deposit, $payload, $admin) {
            $deposit = OfficerDeposit::query()
                ->with(['officer', 'payments.bill'])
                ->lockForUpdate()
                ->findOrFail($deposit->id);

            if ($deposit->status === 'verified') {
                return [
                    'deposit' => $deposit->load(['officer', 'payments.bill.customer', 'payments.bill.receipts']),
                    'transactions' => $this->transactionsFor($deposit),
                ];
            }

            if ($deposit->status !== 'pending') {
                throw new BusinessRuleException('Setoran hanya dapat diproses dari status pending.');
            }

            if (! $deposit->received_at) {
                throw new BusinessRuleException('Uang fisik harus diterima admin sebelum setoran diverifikasi.');
            }

            $decision = $payload['decision'] ?? 'verified';
            $acceptedPayments = $deposit->payments->where('status', '!=', 'rejected');
            $digitalTotal = round((float) $acceptedPayments->sum('amount'), 2);
            $physicalTotal = round((float) $payload['physical_total'], 2);

            if ($decision === 'rejected') {
                $deposit->update([
                    'discrepancy_amount' => $physicalTotal - $digitalTotal,
                    'received_amount' => $physicalTotal,
                    'rejection_reason' => $payload['note'] ?? 'Setoran ditolak admin.',
                    'status' => 'rejected',
                    'verification_note' => $payload['note'] ?? null,
                    'verified_at' => now(),
                    'verified_by' => $admin->id,
                ]);

                Payment::query()
                    ->where('officer_deposit_id', $deposit->id)
                    ->where('status', 'pending')
                    ->update(['officer_deposit_id' => null]);

                $this->auditLogger->write($admin, 'deposit.rejected', "Setoran {$deposit->deposit_number} ditolak.");
                RealtimeNotifier::updated(['finance', 'deposits', 'dashboard', 'field', 'public-summary'], 'admin.deposit.rejected');

                return ['deposit' => $deposit->fresh(['officer', 'payments.bill']), 'transactions' => collect()];
            }

            if ($acceptedPayments->isEmpty()) {
                throw new BusinessRuleException('Setoran tidak memiliki pembayaran yang dapat diverifikasi.');
            }

            [$cashCounted, $qrisConfirmed] = $this->resolvePhysicalBreakdown($deposit, $payload, $physicalTotal);
            $transactions = collect();

            if ($cashCounted > 0) {
                $cashAccount = CashAccount::query()->where('type', 'tunai')->firstOrFail();
                $transactions->push($this->ledger->record(
                    $cashAccount,
                    'income',
                    $cashCounted,
                    "Setoran tunai {$deposit->officer->name} periode {$deposit->period_year}-".str_pad((string) $deposit->period_month, 2, '0', STR_PAD_LEFT),
                    $deposit,
                    $admin,
                ));
            }

            if ($qrisConfirmed > 0) {
                $qrisAccount = CashAccount::query()->where('type', 'qris')->firstOrFail();
                $transactions->push($this->ledger->record(
                    $qrisAccount,
                    'income',
                    $qrisConfirmed,
                    "Setoran QRIS {$deposit->officer->name} periode {$deposit->period_year}-".str_pad((string) $deposit->period_month, 2, '0', STR_PAD_LEFT),
                    $deposit,
                    $admin,
                ));
            }

            $deposit->update([
                'cash_counted' => $cashCounted,
                'cash_total' => (float) $acceptedPayments->where('method', 'tunai')->sum('amount'),
                'discrepancy_amount' => $physicalTotal - $digitalTotal,
                'qris_confirmed' => $qrisConfirmed,
                'qris_total' => (float) $acceptedPayments->where('method', 'qris')->sum('amount'),
                'received_amount' => $physicalTotal,
                'status' => 'verified',
                'total_amount' => $digitalTotal,
                'verification_note' => $payload['note'] ?? null,
                'verified_at' => now(),
                'verified_by' => $admin->id,
            ]);

            foreach ($acceptedPayments as $payment) {
                $payment->update([
                    'status' => 'verified',
                    'verified_at' => now(),
                    'verified_by' => $admin->id,
                ]);
                $payment->bill?->update(['payment_status' => 'lunas']);
            }

            $this->auditLogger->write($admin, 'deposit.verified', "Setoran {$deposit->deposit_number} diverifikasi dan masuk kas.");
            RealtimeNotifier::updated(['finance', 'deposits', 'dashboard', 'field', 'public-summary', 'public-transparency'], 'admin.deposit.verified');

            return [
                'deposit' => $deposit->fresh(['officer', 'payments.bill.customer']),
                'transactions' => $transactions,
            ];
        });
    }

    public function rejectPayment(OfficerDeposit $deposit, Payment $payment, string $reason, User $admin): OfficerDeposit
    {
        return $this->updatePaymentStatus($deposit, $payment, 'rejected', $admin, $reason);
    }

    public function updatePaymentStatus(OfficerDeposit $deposit, Payment $payment, string $status, User $admin, ?string $reason = null): OfficerDeposit
    {
        return DB::transaction(function () use ($deposit, $payment, $status, $admin, $reason) {
            $deposit = OfficerDeposit::query()->lockForUpdate()->findOrFail($deposit->id);

            if ($deposit->status !== 'pending' || $payment->officer_deposit_id !== $deposit->id) {
                throw new BusinessRuleException('Status pembayaran hanya dapat diubah dari setoran pending yang sesuai.');
            }

            $payment->update([
                'rejection_reason' => $status === 'rejected' ? ($reason ?: 'Ditolak admin saat pemeriksaan setoran.') : null,
                'status' => $status,
                'verified_at' => $status === 'verified' ? now() : null,
                'verified_by' => $status === 'verified' ? $admin->id : null,
            ]);
            $payment->bill?->update([
                'payment_status' => match ($status) {
                    'verified' => 'lunas',
                    'rejected' => 'ditolak',
                    default => 'menunggu_verifikasi',
                },
            ]);

            $accepted = $deposit->payments()->where('status', '!=', 'rejected')->get();
            $deposit->update([
                'cash_total' => (float) $accepted->where('method', 'tunai')->sum('amount'),
                'qris_total' => (float) $accepted->where('method', 'qris')->sum('amount'),
                'total_amount' => (float) $accepted->sum('amount'),
            ]);

            $this->auditLogger->write($admin, 'payment.status_updated', "Pembayaran #{$payment->id} pada {$deposit->deposit_number} diubah menjadi {$status}.");
            RealtimeNotifier::updated(['finance', 'deposits', 'dashboard', 'field', 'public-summary'], 'admin.payment.status_updated');

            return $deposit->fresh(['officer', 'payments.bill.customer', 'payments.bill.receipts']);
        });
    }

    public function transactionsFor(OfficerDeposit $deposit): Collection
    {
        return CashTransaction::query()
            ->where('reference_type', $deposit->getMorphClass())
            ->where('reference_id', $deposit->id)
            ->get();
    }

    private function resolvePhysicalBreakdown(OfficerDeposit $deposit, array $payload, float $physicalTotal): array
    {
        $cashCounted = array_key_exists('cash_counted', $payload)
            ? round((float) $payload['cash_counted'], 2)
            : null;
        $qrisConfirmed = array_key_exists('qris_confirmed', $payload)
            ? round((float) $payload['qris_confirmed'], 2)
            : null;

        if ($cashCounted === null && $qrisConfirmed === null) {
            $qrisConfirmed = min($physicalTotal, (float) $deposit->qris_total);
            $cashCounted = $physicalTotal - $qrisConfirmed;
        } else {
            $cashCounted ??= $physicalTotal - (float) $qrisConfirmed;
            $qrisConfirmed ??= $physicalTotal - (float) $cashCounted;
        }

        if ($cashCounted < 0 || $qrisConfirmed < 0 || round($cashCounted + $qrisConfirmed, 2) !== $physicalTotal) {
            throw new BusinessRuleException('Total uang tunai dan QRIS harus sama dengan physical_total.');
        }

        return [$cashCounted, $qrisConfirmed];
    }
}
