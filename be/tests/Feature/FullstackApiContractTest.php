<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Database\Seeders\PamsimasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FullstackApiContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_vite_ports_receive_cors_headers(): void
    {
        $origin = 'http://127.0.0.1:5174';
        $patterns = config('cors.allowed_origins_patterns', []);

        $this->assertTrue(collect($patterns)->contains(
            fn (string $pattern) => preg_match($pattern, $origin) === 1,
        ));
    }

    public function test_admin_login_dashboard_and_remaining_frontend_contracts_are_available(): void
    {
        $this->seed(PamsimasSeeder::class);

        $login = $this->postJson('/api/auth/login', [
            'login' => 'admin',
            'password' => 'password',
        ])->assertOk()->assertJsonPath('user.role', 'admin');
        $headers = ['Authorization' => 'Bearer '.$login->json('token')];

        $this->withHeaders($headers)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.username', 'admin');

        $this->withHeaders($headers)->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'active_customers',
                'activity_logs' => [['action', 'actor_name', 'description', 'logged_at']],
                'cash_accounts' => ['cash', 'qris'],
                'monthly_expenses',
                'payment' => ['paid_percentage', 'unpaid_percentage'],
                'pending_deposits',
                'period_label',
            ])
            ->assertJsonPath('monthly_expenses', 0)
            ->assertJsonPath('activity_logs.0.action', 'auth.login');

        $customer = Customer::query()->firstOrFail();
        $this->withHeaders($headers)->getJson('/api/admin/customers/'.$customer->customer_code)
            ->assertOk()
            ->assertJsonPath('data.customer.customer_code', $customer->customer_code)
            ->assertJsonStructure(['data' => ['customer', 'current_bill', 'history']]);

        $officer = User::query()->where('role', 'petugas')->firstOrFail();
        $this->withHeaders($headers)->getJson('/api/admin/officers/'.$officer->id)
            ->assertOk()
            ->assertJsonPath('data.id', $officer->id)
            ->assertJsonStructure(['data' => ['deposits', 'summary']]);

        $this->withHeaders($headers)->patchJson('/api/admin/settings', [
            'settings' => [
                'base_tariff' => ['admin_fee' => 5000, 'water_rate_per_m3' => 3500],
                'billing_period' => ['due_day' => 25, 'month' => 9, 'year' => 2026],
                'late_fee' => 2500,
                'receipt_signatory' => ['name' => 'ADE SOPIAN', 'title' => 'Ketua KPSPAMS TIRTA SARI'],
            ],
        ])->assertOk()->assertJsonPath('data.settings.billing_period.month', 9);

        $this->withHeaders($headers)->putJson('/api/admin/settings/faqs', [
            'faqs' => [
                ['answer' => 'Jawaban terbaru.', 'category' => 'Umum', 'question' => 'Pertanyaan terbaru?'],
            ],
        ])->assertOk()->assertJsonCount(1, 'data');

        $this->getJson('/api/publik/faqs')
            ->assertOk()
            ->assertJsonPath('data.0.question', 'Pertanyaan terbaru?');
        $this->getJson('/api/publik/summary')
            ->assertOk()
            ->assertJsonStructure(['data' => ['active_customers', 'overdue_percentage', 'served_areas']]);
    }

    public function test_petugas_login_dashboard_profile_and_role_boundary_are_available(): void
    {
        $this->seed(PamsimasSeeder::class);

        $login = $this->postJson('/api/auth/login', [
            'login' => 'budisantoso',
            'password' => '0812-3456-7890',
        ])->assertOk()->assertJsonPath('user.role', 'petugas');
        $headers = ['Authorization' => 'Bearer '.$login->json('token')];

        $this->withHeaders($headers)->getJson('/api/petugas/account')
            ->assertOk()
            ->assertJsonPath('data.username', 'budisantoso')
            ->assertJsonStructure(['data' => ['area', 'avatar', 'name', 'phone', 'role', 'status', 'username']]);

        $this->withHeaders($headers)->getJson('/api/petugas/dashboard')
            ->assertOk()
            ->assertJsonPath('data.assigned_customers', 104)
            ->assertJsonStructure(['data' => [
                'assigned_customers',
                'monthly_bill_total',
                'paid_customers',
                'pending_deposit_amount',
                'pending_verification_amount',
                'period',
                'recorded_meters',
            ]]);

        $this->withHeaders($headers)->getJson('/api/petugas/customers?search=PEL-2026-001')
            ->assertOk()
            ->assertJsonPath('data.0.billStatus', 'Sudah Membayar')
            ->assertJsonPath('data.0.depositStatus', 'Menunggu Verifikasi');

        $this->withHeaders($headers)->getJson('/api/admin/dashboard')->assertForbidden();
    }

    public function test_admin_phone_update_becomes_the_officer_password(): void
    {
        $this->seed(PamsimasSeeder::class);

        $adminLogin = $this->postJson('/api/auth/login', [
            'login' => 'admin',
            'password' => 'password',
        ])->assertOk();
        $adminHeaders = ['Authorization' => 'Bearer '.$adminLogin->json('token')];
        $officer = User::query()->where('role', 'petugas')->firstOrFail();

        $this->withHeaders($adminHeaders)->patchJson('/api/admin/officers/'.$officer->id, [
            'phone' => '0812-0000-9999',
        ])->assertOk()->assertJsonPath('phone', '0812-0000-9999');

        $this->postJson('/api/auth/login', [
            'login' => $officer->username,
            'password' => '0812-3456-7890',
        ])->assertUnprocessable();

        $this->postJson('/api/auth/login', [
            'login' => $officer->username,
            'password' => '0812-0000-9999',
        ])->assertOk()->assertJsonPath('user.role', 'petugas');
    }
}
