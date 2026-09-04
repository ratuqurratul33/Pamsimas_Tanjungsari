<?php

namespace Tests\Feature;

use Database\Seeders\PamsimasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PetugasCustomerListQueryCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_list_does_not_n_plus_one_per_customer(): void
    {
        $this->seed(PamsimasSeeder::class);

        $login = $this->postJson('/api/auth/login', ['login' => 'budisantoso', 'password' => '0812-3456-7890'])->assertOk();
        $headers = ['Authorization' => 'Bearer '.$login->json('token')];

        DB::enableQueryLog();
        $response = $this->withHeaders($headers)->getJson('/api/petugas/customers?per_page=100')->assertOk();
        $queryCount = count(DB::getQueryLog());
        DB::disableQueryLog();

        $customerCount = count($response->json('data'));
        $this->assertGreaterThan(1, $customerCount, 'Seeder should produce more than one petugas customer to make this a meaningful N+1 check.');

        // Fixed-cost queries only (auth guard, region lookup, the paginated
        // customer query itself, its eager loads, and the count query for
        // pagination) — this must NOT scale with $customerCount, or the
        // per-customer bill/meterReadings queries FieldCustomerPresenter
        // used to fire are back.
        $this->assertLessThan(20, $queryCount, "Expected a flat, small query count regardless of customer count, got {$queryCount} for {$customerCount} customers.");
    }
}
