<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\CashTransfer;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CashLedgerService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function record(
        CashAccount $account,
        string $type,
        float|int|string $amount,
        string $description,
        ?Model $reference,
        ?User $actor,
        mixed $occurredAt = null,
    ): CashTransaction {
        $amount = round((float) $amount, 2);

        if ($amount <= 0) {
            throw new BusinessRuleException('Nominal transaksi kas harus lebih besar dari 0.');
        }

        if ($reference) {
            $existing = CashTransaction::query()
                ->where('cash_account_id', $account->id)
                ->where('reference_type', $reference->getMorphClass())
                ->where('reference_id', $reference->getKey())
                ->where('type', $type)
                ->first();

            if ($existing) {
                return $existing;
            }
        }

        $lockedAccount = CashAccount::query()->lockForUpdate()->findOrFail($account->id);
        $isCredit = in_array($type, ['income', 'transfer_in', 'adjustment'], true);
        $newBalance = round((float) $lockedAccount->current_balance + ($isCredit ? $amount : -$amount), 2);

        if ($newBalance < 0) {
            throw new BusinessRuleException("Saldo {$lockedAccount->name} tidak mencukupi.");
        }

        $lockedAccount->update(['current_balance' => $newBalance]);

        return CashTransaction::create([
            'amount' => $amount,
            'balance_after' => $newBalance,
            'cash_account_id' => $lockedAccount->id,
            'created_by' => $actor?->id,
            'description' => $description,
            'reference_id' => $reference?->getKey(),
            'reference_type' => $reference?->getMorphClass(),
            'status' => 'posted',
            'transaction_at' => $occurredAt ?? now(),
            'type' => $type,
        ]);
    }

    public function addIncome(array $payload, User $actor): CashTransaction
    {
        return DB::transaction(function () use ($payload, $actor) {
            $account = CashAccount::query()->findOrFail($payload['account_id']);
            $isOpeningBalance = (bool) ($payload['is_opening_balance'] ?? false);

            if ($isOpeningBalance && $account->opening_balance_locked_at) {
                throw new BusinessRuleException('Saldo awal akun ini sudah pernah ditetapkan.');
            }

            $transaction = $this->record(
                $account,
                $isOpeningBalance ? 'adjustment' : 'income',
                $payload['amount'],
                $payload['description'],
                null,
                $actor,
                $payload['occurred_at'] ?? now(),
            );

            if ($isOpeningBalance) {
                $account->refresh()->update([
                    'opening_balance' => $payload['amount'],
                    'opening_balance_locked_at' => now(),
                    'opening_balance_locked_by' => $actor->id,
                    'opening_balance_period' => now()->startOfMonth()->toDateString(),
                ]);
            }

            $this->auditLogger->write($actor, 'cash.income', "Pemasukan kas #{$transaction->id} dicatat.");

            return $transaction;
        });
    }

    public function transfer(array $payload, User $actor): Collection
    {
        return DB::transaction(function () use ($payload, $actor) {
            if ((int) $payload['from_account_id'] === (int) $payload['to_account_id']) {
                throw new BusinessRuleException('Akun asal dan tujuan harus berbeda.');
            }

            $ids = collect([$payload['from_account_id'], $payload['to_account_id']])->map(fn ($id) => (int) $id)->sort()->values();
            $accounts = CashAccount::query()->whereIn('id', $ids)->lockForUpdate()->get()->keyBy('id');
            $from = $accounts->get((int) $payload['from_account_id']);
            $to = $accounts->get((int) $payload['to_account_id']);

            if (! $from || ! $to) {
                throw new BusinessRuleException('Akun kas asal atau tujuan tidak ditemukan.');
            }

            $transfer = CashTransfer::create([
                'amount' => $payload['amount'],
                'created_by' => $actor->id,
                'from_cash_account_id' => $from->id,
                'note' => $payload['description'],
                'to_cash_account_id' => $to->id,
                'transfer_date' => $payload['occurred_at'],
            ]);

            $occurredAt = $payload['occurred_at'];
            $out = $this->record($from, 'transfer_out', $payload['amount'], 'Transfer keluar: '.$payload['description'], $transfer, $actor, $occurredAt);
            $in = $this->record($to, 'transfer_in', $payload['amount'], 'Transfer masuk: '.$payload['description'], $transfer, $actor, $occurredAt);

            $this->auditLogger->write($actor, 'cash.transfer', "Mutasi kas #{$transfer->id} berhasil diposting.");

            return collect([$out, $in]);
        });
    }
}
