<?php

namespace Tests\Feature;

use App\Models\CashAccount;
use App\Models\Expense;
use Database\Seeders\PamsimasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseEditTest extends TestCase
{
    use RefreshDatabase;

    private function loginAsAdmin(): array
    {
        $login = $this->postJson('/api/auth/login', ['login' => 'admin', 'password' => 'password'])->assertOk();

        return ['Authorization' => 'Bearer '.$login->json('token')];
    }

    public function test_editing_amount_adjusts_the_linked_cash_transaction_and_balance(): void
    {
        $this->seed(PamsimasSeeder::class);
        $headers = $this->loginAsAdmin();
        $cashAccount = CashAccount::query()->where('type', 'tunai')->firstOrFail();

        $this->withHeaders([...$headers, 'Idempotency-Key' => 'test-income-for-expense-edit'])
            ->postJson('/api/admin/cash-transactions/income', [
                'account_id' => $cashAccount->id,
                'amount' => 500000,
                'description' => 'Dana awal pengujian edit pengeluaran.',
                'occurred_at' => '2026-08-21T08:00:00+07:00',
            ])->assertCreated();

        $balanceBeforeExpense = (int) $cashAccount->fresh()->current_balance;

        $expense = $this->withHeaders($headers)->postJson('/api/admin/expenses', [
            'amount' => 100000,
            'cash_account_id' => $cashAccount->id,
            'category' => 'Pemeliharaan',
            'description' => 'Pembelian awal.',
            'expense_date' => '2026-08-21',
            'is_public' => false,
            'payment_method' => 'cash',
        ])->assertCreated()->assertJsonPath('data.status', 'draft');
        $expenseId = (int) $expense->json('data.id');

        $this->withHeaders([...$headers, 'Idempotency-Key' => 'test-post-for-edit-'.$expenseId])
            ->postJson('/api/admin/expenses/'.$expenseId.'/post')
            ->assertOk();

        $this->assertSame($balanceBeforeExpense - 100000, (int) $cashAccount->fresh()->current_balance);

        // Correct the nominal from 100.000 to 150.000 — balance should drop
        // by the extra 50.000, not by the new total or not at all.
        $this->withHeaders($headers)->patchJson('/api/admin/expenses/'.$expenseId, [
            'amount' => 150000,
            'category' => 'Perbaikan Pipa',
        ])->assertOk()
            ->assertJsonPath('data.amount', 150000)
            ->assertJsonPath('data.category', 'Perbaikan Pipa');

        $this->assertSame($balanceBeforeExpense - 150000, (int) $cashAccount->fresh()->current_balance);
        $this->assertDatabaseHas('expenses', ['id' => $expenseId, 'amount' => 150000, 'category' => 'Perbaikan Pipa']);

        $cashTransactionId = Expense::query()->findOrFail($expenseId)->cash_transaction_id;
        $this->assertDatabaseHas('cash_transactions', ['id' => $cashTransactionId, 'amount' => 150000]);

        // Editing back down should restore the balance symmetrically.
        $this->withHeaders($headers)->patchJson('/api/admin/expenses/'.$expenseId, ['amount' => 100000])
            ->assertOk();
        $this->assertSame($balanceBeforeExpense - 100000, (int) $cashAccount->fresh()->current_balance);
    }

    public function test_editing_amount_beyond_available_balance_is_rejected(): void
    {
        $this->seed(PamsimasSeeder::class);
        $headers = $this->loginAsAdmin();
        $cashAccount = CashAccount::query()->where('type', 'tunai')->firstOrFail();

        $this->withHeaders([...$headers, 'Idempotency-Key' => 'test-income-for-reject-edit'])
            ->postJson('/api/admin/cash-transactions/income', [
                'account_id' => $cashAccount->id,
                'amount' => 120000,
                'description' => 'Dana pas-pasan untuk pengujian.',
                'occurred_at' => '2026-08-21T08:00:00+07:00',
            ])->assertCreated();

        $expense = $this->withHeaders($headers)->postJson('/api/admin/expenses', [
            'amount' => 100000,
            'cash_account_id' => $cashAccount->id,
            'category' => 'Pemeliharaan',
            'description' => 'Pembelian.',
            'expense_date' => '2026-08-21',
            'is_public' => false,
            'payment_method' => 'cash',
        ])->assertCreated();
        $expenseId = (int) $expense->json('data.id');

        $this->withHeaders([...$headers, 'Idempotency-Key' => 'test-post-for-reject-'.$expenseId])
            ->postJson('/api/admin/expenses/'.$expenseId.'/post')
            ->assertOk();

        // Only 20.000 left in the account; raising the expense by 50.000 must fail.
        $this->withHeaders($headers)->patchJson('/api/admin/expenses/'.$expenseId, ['amount' => 150000])
            ->assertStatus(422);

        $this->assertDatabaseHas('expenses', ['id' => $expenseId, 'amount' => 100000]);
    }
}
