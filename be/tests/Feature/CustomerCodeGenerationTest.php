<?php

namespace Tests\Feature;

use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerCodeGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_next_customer_code_continues_the_sequence_regardless_of_legacy_separator(): void
    {
        Customer::create(['address' => 'Jl. Contoh 1', 'customer_code' => 'PAM 006', 'name' => 'Legacy Space Format']);
        Customer::create(['address' => 'Jl. Contoh 2', 'customer_code' => 'PAM 009', 'name' => 'Legacy Space Format Two']);

        $this->assertSame('PAM-010', Customer::nextCustomerCode());
    }

    public function test_next_customer_code_starts_at_one_when_no_customers_exist(): void
    {
        $this->assertSame('PAM-001', Customer::nextCustomerCode());
    }

    public function test_next_customer_code_ignores_unrelated_codes(): void
    {
        Customer::create(['address' => 'Jl. Contoh 1', 'customer_code' => 'LEGACY-999', 'name' => 'Unrelated Format']);

        $this->assertSame('PAM-001', Customer::nextCustomerCode());
    }
}
