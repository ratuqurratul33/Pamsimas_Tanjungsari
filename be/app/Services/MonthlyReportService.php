<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\Bill;
use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\Expense;
use App\Models\OfficerDeposit;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class MonthlyReportService
{
    public function build(string $period, ?int $officerId = null, ?int $dusunId = null): array
    {
        [$start, $end, $month, $year] = $this->periodRange($period);
        $billQuery = Bill::query()->where('period_month', $month)->where('period_year', $year);

        if ($dusunId) {
            $billQuery->whereHas('customer', fn (Builder $query) => $query->where('dusun_id', $dusunId));
        }

        if ($officerId) {
            $billQuery->whereHas('customer.rt.officers', fn (Builder $query) => $query->whereKey($officerId));
        }

        $billIds = (clone $billQuery)->pluck('id');
        $payments = Payment::query()
            ->with('bill')
            ->whereIn('bill_id', $billIds)
            ->where('status', 'verified')
            ->when($officerId, fn (Builder $query) => $query->where('officer_id', $officerId))
            ->get();

        $deposits = OfficerDeposit::query()
            ->with('officer')
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->when($officerId, fn (Builder $query) => $query->where('officer_id', $officerId))
            ->get();

        $transactions = CashTransaction::query()
            ->with('creator')
            ->where('status', 'posted')
            ->whereBetween('transaction_at', [$start, $end])
            ->orderBy('transaction_at')
            ->get();
        $expenses = Expense::query()
            ->where('status', 'posted')
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->get();
        $openingBalance = $this->openingBalance($start);
        $income = (float) $transactions->where('type', 'income')->sum('amount');
        $expenseAmount = (float) $transactions->where('type', 'expense')->sum('amount');
        $adjustment = (float) $transactions->where('type', 'adjustment')->sum('amount');
        $closingBalance = $openingBalance + $income + $adjustment - $expenseAmount;
        $billedCustomers = (clone $billQuery)->distinct('customer_id')->count('customer_id');
        $paidCustomers = $payments->pluck('bill.customer_id')->filter()->unique()->count();

        return [
            'cash' => [
                'closing_balance' => (int) round($closingBalance),
                'expense_amount' => (int) round($expenseAmount),
                'income_from_verified_deposits' => (int) round($income),
                'opening_balance' => (int) round($openingBalance),
                'transfer_amount' => (int) round($transactions->where('type', 'transfer_out')->sum('amount')),
            ],
            'collection' => [
                'billed_customers' => $billedCustomers,
                'collection_percentage' => $billedCustomers > 0 ? round(($paidCustomers / $billedCustomers) * 100, 2) : 0,
                'payments_amount' => (int) round((float) $payments->sum('amount')),
                'payments_recorded' => $paidCustomers,
            ],
            'deposits' => [
                'discrepancy_amount' => (int) round((float) $deposits->where('status', 'verified')->sum('discrepancy_amount')),
                'pending_count' => $deposits->where('status', 'pending')->count(),
                'rejected_count' => $deposits->where('status', 'rejected')->count(),
                'verified_amount' => (int) round((float) $deposits->where('status', 'verified')->sum('received_amount')),
                'verified_count' => $deposits->where('status', 'verified')->count(),
            ],
            'expense_rows' => $expenses->map(fn (Expense $expense) => [
                'amount' => (int) round((float) $expense->amount),
                'category' => $expense->category,
                'date' => $expense->expense_date->toDateString(),
                'description' => $expense->description,
            ])->values(),
            'expenses_by_category' => $expenses->groupBy('category')->map(fn ($rows, $category) => [
                'amount' => (int) round((float) $rows->sum('amount')),
                'category' => $category,
                'count' => $rows->count(),
            ])->values(),
            'generated_at' => now()->toIso8601String(),
            'income_rows' => $transactions->whereIn('type', ['income', 'adjustment'])->map(fn (CashTransaction $transaction) => [
                'amount' => (int) round((float) $transaction->amount),
                'date' => $transaction->transaction_at->toDateString(),
                'description' => $transaction->description,
            ])->values(),
            'officers' => $deposits->groupBy('officer_id')->map(function ($rows, $id) use ($payments) {
                return [
                    'discrepancy' => (int) round((float) $rows->where('status', 'verified')->sum('discrepancy_amount')),
                    'officer_id' => (int) $id,
                    'officer_name' => $rows->first()?->officer?->name,
                    'payments' => $payments->where('officer_id', (int) $id)->count(),
                    'verified_deposits' => (int) round((float) $rows->where('status', 'verified')->sum('received_amount')),
                ];
            })->values(),
            'period' => sprintf('%04d-%02d', $year, $month),
            'scope' => ['dusun_id' => $dusunId, 'officer_id' => $officerId],
        ];
    }

    private function openingBalance(Carbon $start): float
    {
        return (float) CashAccount::query()->get()->sum(function (CashAccount $account) use ($start) {
            $transactions = CashTransaction::query()
                ->where('cash_account_id', $account->id)
                ->where('status', 'posted')
                ->where('transaction_at', '<', $start)
                ->get();
            $openingWasPosted = $transactions->contains(fn (CashTransaction $transaction) => $transaction->type === 'adjustment' && $transaction->reference_id === null);
            $base = $openingWasPosted ? 0.0 : (float) $account->opening_balance;

            return $base
                + (float) $transactions->whereIn('type', ['income', 'transfer_in', 'adjustment'])->sum('amount')
                - (float) $transactions->whereIn('type', ['expense', 'transfer_out'])->sum('amount');
        });
    }

    private function periodRange(string $period): array
    {
        if (! preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $period, $matches)) {
            throw new BusinessRuleException('Format periode harus YYYY-MM.');
        }

        $year = (int) $matches[1];
        $month = (int) $matches[2];
        $start = Carbon::create($year, $month, 1)->startOfDay();

        return [$start, $start->copy()->endOfMonth()->endOfDay(), $month, $year];
    }
}
