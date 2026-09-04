<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\Expense;
use App\Models\User;
use App\Support\RealtimeNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ExpenseService
{
    public function __construct(
        private readonly CashLedgerService $ledger,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function post(Expense $expense, array $payload, User $admin): array
    {
        return DB::transaction(function () use ($expense, $payload, $admin) {
            $expense = Expense::query()->with('cashAccount')->lockForUpdate()->findOrFail($expense->id);

            if ($expense->status === 'posted' && $expense->cashTransaction) {
                return ['expense' => $expense, 'transaction' => $expense->cashTransaction];
            }

            if ($expense->status !== 'draft') {
                throw new BusinessRuleException('Pengeluaran hanya dapat diposting dari status draft.');
            }

            $transaction = $this->ledger->record(
                $expense->cashAccount,
                'expense',
                $expense->amount,
                $expense->description,
                $expense,
                $admin,
                $expense->expense_date->endOfDay(),
            );

            $expense->update([
                'cash_transaction_id' => $transaction->id,
                'posted_at' => now(),
                'posted_by' => $admin->id,
                'posting_note' => $payload['note'] ?? null,
                'status' => 'posted',
            ]);

            $this->auditLogger->write($admin, 'expense.posted', "Pengeluaran #{$expense->id} diposting ke kas.");
            RealtimeNotifier::updated(['finance', 'dashboard', 'public-transparency'], 'admin.expense.posted');

            return ['expense' => $expense->fresh(['cashAccount', 'cashTransaction', 'creator']), 'transaction' => $transaction];
        });
    }

    /**
     * Corrects an already-recorded expense in place (wrong nominal/category/
     * etc.) instead of the old void-then-repost dance. If the amount changed
     * and this expense already moved money (it always does — expenses are
     * posted the moment they're created), the linked cash transaction and
     * account balance are adjusted by the delta so the ledger stays correct.
     * The cash account itself is intentionally not editable here to avoid
     * cross-account ledger surgery; only the amount/description fields are.
     */
    public function update(Expense $expense, array $payload, User $admin): Expense
    {
        return DB::transaction(function () use ($expense, $payload, $admin) {
            $expense = Expense::query()->with('cashTransaction')->lockForUpdate()->findOrFail($expense->id);
            $oldAmount = round((float) $expense->amount, 2);
            $newAmount = array_key_exists('amount', $payload) ? round((float) $payload['amount'], 2) : $oldAmount;
            $delta = round($newAmount - $oldAmount, 2);

            if ($delta !== 0.0 && $expense->cashTransaction) {
                $account = CashAccount::query()->lockForUpdate()->findOrFail($expense->cash_account_id);
                $newBalance = round((float) $account->current_balance - $delta, 2);

                if ($newBalance < 0) {
                    throw new BusinessRuleException("Saldo {$account->name} tidak mencukupi untuk perubahan nominal ini.");
                }

                $account->update(['current_balance' => $newBalance]);
                $expense->cashTransaction->update(['amount' => $newAmount, 'balance_after' => $newBalance]);
            }

            if (array_key_exists('proof_path', $payload) && $payload['proof_path'] && $expense->proof_path) {
                Storage::disk('public')->delete($expense->proof_path);
            }

            $expenseDate = $payload['expense_date'] ?? $expense->expense_date;

            $expense->update([
                'amount' => $newAmount,
                'category' => $payload['category'] ?? $expense->category,
                'description' => $payload['description'] ?? $expense->description,
                'expense_date' => $expenseDate,
                'is_public' => array_key_exists('is_public', $payload) ? (bool) $payload['is_public'] : $expense->is_public,
                'proof_path' => $payload['proof_path'] ?? $expense->proof_path,
                'reference_number' => $payload['reference_number'] ?? $expense->reference_number,
                'vendor' => $payload['vendor'] ?? $expense->vendor,
            ]);

            if ($expense->cashTransaction) {
                $expense->cashTransaction->update(['transaction_at' => $expense->expense_date->copy()->endOfDay()]);
            }

            $this->auditLogger->write($admin, 'expense.updated', "Pengeluaran #{$expense->id} diperbarui.");
            RealtimeNotifier::updated(['finance', 'dashboard', 'public-transparency'], 'admin.expense.updated');

            return $expense->fresh(['cashAccount', 'cashTransaction', 'creator']);
        });
    }

    public function void(Expense $expense, array $payload, User $admin): array
    {
        return DB::transaction(function () use ($expense, $payload, $admin) {
            $expense = Expense::query()->with(['cashAccount', 'cashTransaction'])->lockForUpdate()->findOrFail($expense->id);

            if ($expense->status === 'voided') {
                $reversal = CashTransaction::query()
                    ->where('cash_account_id', $expense->cash_account_id)
                    ->where('reference_type', $expense->getMorphClass())
                    ->where('reference_id', $expense->id)
                    ->where('type', 'adjustment')
                    ->firstOrFail();

                return ['expense' => $expense, 'transaction' => $reversal];
            }

            if ($expense->status !== 'posted' || ! $expense->cashTransaction) {
                throw new BusinessRuleException('Hanya pengeluaran posted yang dapat dibatalkan.');
            }

            $reversal = $this->ledger->record(
                $expense->cashAccount,
                'adjustment',
                $expense->amount,
                'Pembalik pengeluaran #'.$expense->id.': '.($payload['reason'] ?? $expense->description),
                $expense,
                $admin,
            );

            $expense->update([
                'posting_note' => trim(($expense->posting_note ? $expense->posting_note."\n" : '').'VOID: '.($payload['reason'] ?? 'Dibatalkan admin')),
                'status' => 'voided',
                'voided_at' => now(),
                'voided_by' => $admin->id,
            ]);

            $this->auditLogger->write($admin, 'expense.voided', "Pengeluaran #{$expense->id} dibatalkan dengan transaksi pembalik.");
            RealtimeNotifier::updated(['finance', 'dashboard', 'public-transparency'], 'admin.expense.voided');

            return ['expense' => $expense->fresh(['cashAccount', 'cashTransaction', 'creator']), 'transaction' => $reversal];
        });
    }
}
