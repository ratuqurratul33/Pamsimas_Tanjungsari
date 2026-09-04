<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Models\Expense;
use App\Models\OfficerDeposit;
use Database\Seeders\PamsimasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_verified_deposit_and_posted_expense_update_the_same_cash_ledger(): void
    {
        $this->seed(PamsimasSeeder::class);

        $login = $this->postJson('/api/auth/login', [
            'login' => 'admin',
            'password' => 'password',
        ])->assertOk();
        $authorization = ['Authorization' => 'Bearer '.$login->json('token')];

        $deposit = OfficerDeposit::query()
            ->with('payments')
            ->where('status', 'pending')
            ->firstOrFail();
        $digitalTotal = (int) round((float) $deposit->payments->where('status', '!=', 'rejected')->sum('amount'));
        $balanceBeforeDeposit = (int) CashAccount::query()->sum('current_balance');

        $this->withHeaders([
            ...$authorization,
            'Idempotency-Key' => 'test-verify-deposit-'.$deposit->id,
        ])->postJson('/api/admin/deposits/'.$deposit->id.'/verify', [
            'decision' => 'verified',
            'note' => 'Uang fisik cocok dengan catatan digital.',
            'physical_total' => $digitalTotal,
        ])->assertOk()
            ->assertJsonPath('data.deposit.discrepancy', 0)
            ->assertJsonPath('data.deposit.status', 'verified');

        $this->assertSame(
            $balanceBeforeDeposit + $digitalTotal,
            (int) CashAccount::query()->sum('current_balance'),
        );
        $this->assertSame(
            $digitalTotal,
            (int) CashTransaction::query()
                ->where('reference_type', $deposit->getMorphClass())
                ->where('reference_id', $deposit->id)
                ->sum('amount'),
        );

        $cashAccount = CashAccount::query()->where('type', 'tunai')->firstOrFail();
        $this->withHeaders([
            ...$authorization,
            'Idempotency-Key' => 'test-manual-income',
        ])->postJson('/api/admin/cash-transactions/income', [
            'account_id' => $cashAccount->id,
            'amount' => 500000,
            'description' => 'Tambahan dana untuk pengujian posting pengeluaran.',
            'occurred_at' => '2026-08-21T08:00:00+07:00',
        ])->assertCreated()
            ->assertJsonPath('data.type', 'income');

        $expense = $this->withHeaders($authorization)->postJson('/api/admin/expenses', [
            'amount' => 200000,
            'cash_account_id' => $cashAccount->id,
            'category' => 'Pemeliharaan',
            'description' => 'Pembelian material perbaikan pipa.',
            'expense_date' => '2026-08-21',
            'is_public' => true,
            'payment_method' => 'cash',
            'vendor' => 'Toko Material Desa',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'draft');
        $expenseId = (int) $expense->json('data.id');
        $balanceBeforeExpense = (int) $cashAccount->fresh()->current_balance;

        $this->withHeaders([
            ...$authorization,
            'Idempotency-Key' => 'test-post-expense-'.$expenseId,
        ])->postJson('/api/admin/expenses/'.$expenseId.'/post', [
            'note' => 'Bukti fisik sudah diperiksa.',
        ])->assertOk()
            ->assertJsonPath('data.cash_transaction.type', 'expense')
            ->assertJsonPath('data.expense.status', 'posted');

        $this->assertSame($balanceBeforeExpense - 200000, (int) $cashAccount->fresh()->current_balance);
        $this->assertDatabaseHas('expenses', [
            'id' => $expenseId,
            'status' => 'posted',
        ]);
        $this->assertNotNull(Expense::query()->findOrFail($expenseId)->cash_transaction_id);

        $this->withHeaders($authorization)->getJson('/api/admin/reports/monthly?period=2026-08')
            ->assertOk()
            ->assertJsonPath('data.deposits.verified_count', 1)
            ->assertJsonPath('data.cash.expense_amount', 200000);
    }
}
