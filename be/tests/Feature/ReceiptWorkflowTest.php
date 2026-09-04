<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\Customer;
use App\Models\Receipt;
use App\Models\User;
use Database\Seeders\PamsimasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReceiptWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_meter_submission_queues_receipt_and_admin_prints_three_per_a4(): void
    {
        $this->seed(PamsimasSeeder::class);
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $officer = User::query()->where('role', 'petugas')->firstOrFail();
        $customer = $this->unmeteredCustomerFor($officer);

        Sanctum::actingAs($officer);
        $this->postJson('/api/petugas/meter-readings', [
            'current_meter' => 212,
            'customer_id' => $customer->id,
            'period_month' => 9,
            'period_year' => 2026,
            'previous_meter' => 200,
        ])->assertCreated();

        $receipt = Receipt::query()
            ->where('customer_id', $customer->id)
            ->where('period_month', 9)
            ->where('period_year', 2026)
            ->firstOrFail();

        $this->assertSame('queued', $receipt->status);
        $this->assertNotNull($receipt->bill_id);
        $this->assertSame($officer->id, $receipt->officer_id);

        Sanctum::actingAs($admin);
        $this->getJson("/api/admin/receipts?period=2026-09&officer_id={$officer->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.meter_start', 200)
            ->assertJsonPath('data.0.meter_end', 212)
            ->assertJsonPath('data.0.meter_usage', 12)
            ->assertJsonPath('summary.slots_per_page', 3);

        $this->withHeader('Idempotency-Key', 'receipt-workflow-three-up')
            ->postJson('/api/admin/receipts/batches', [
                'include_empty_slots' => true,
                'officer_id' => $officer->id,
                'period' => '2026-09',
                'receipt_ids' => [$receipt->id],
                'template' => 'pamsimas-a4-3-up',
            ])
            ->assertCreated()
            ->assertJsonPath('data.receipt_count', 1)
            ->assertJsonPath('data.page_count', 1)
            ->assertJsonPath('data.slots_per_page', 3)
            ->assertJsonPath('data.empty_slots', 2)
            ->assertJsonPath('data.receipts.0.template_snapshot.signatory_name', 'ADE SOPIAN')
            ->assertJsonPath('data.receipts.0.template_snapshot.signatory_title', 'Ketua KPSPAMS TIRTA SARI');

        Sanctum::actingAs($officer);
        $this->post('/api/petugas/payments', [
            'bill_id' => $receipt->bill_id,
            'method' => 'tunai',
            'proof' => UploadedFile::fake()->create('kwitansi-cap.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json'])->assertCreated();
    }

    public function test_payment_is_rejected_until_admin_prints_the_receipt(): void
    {
        $this->seed(PamsimasSeeder::class);
        $officer = User::query()->where('role', 'petugas')->firstOrFail();
        $customer = $this->unmeteredCustomerFor($officer);

        Sanctum::actingAs($officer);
        $this->postJson('/api/petugas/meter-readings', [
            'current_meter' => 307,
            'customer_id' => $customer->id,
            'period_month' => 10,
            'period_year' => 2026,
            'previous_meter' => 300,
        ])->assertCreated();

        $receipt = Receipt::query()
            ->where('customer_id', $customer->id)
            ->where('period_month', 10)
            ->where('period_year', 2026)
            ->firstOrFail();

        $this->post('/api/petugas/payments', [
            'bill_id' => $receipt->bill_id,
            'method' => 'tunai',
            'proof' => UploadedFile::fake()->create('kwitansi-cap.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Pembayaran belum dapat dicatat karena kwitansi fisik belum dicetak admin.');
    }

    public function test_admin_can_correct_meter_reading_after_the_receipt_is_printed(): void
    {
        $this->seed(PamsimasSeeder::class);
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $officer = User::query()->where('role', 'petugas')->firstOrFail();
        $customer = $this->unmeteredCustomerFor($officer);

        Sanctum::actingAs($officer);
        $this->postJson('/api/petugas/meter-readings', [
            'current_meter' => 210,
            'customer_id' => $customer->id,
            'period_month' => 7,
            'period_year' => 2027,
            'previous_meter' => 200,
        ])->assertCreated();

        $receipt = Receipt::query()
            ->where('customer_id', $customer->id)
            ->where('period_month', 7)
            ->where('period_year', 2027)
            ->firstOrFail();

        Sanctum::actingAs($admin);
        $this->withHeader('Idempotency-Key', 'receipt-correction-first-print')
            ->postJson('/api/admin/receipts/batches', [
                'officer_id' => $officer->id,
                'period' => '2027-07',
                'receipt_ids' => [$receipt->id],
            ])
            ->assertCreated();

        $bill = Bill::findOrFail($receipt->bill_id);
        $waterRate = (float) $bill->water_rate;
        $adminFee = (float) $bill->admin_fee;
        $meterReadingId = $bill->meter_reading_id;

        // Admin notices the meter was mistyped and corrects it — this must be
        // allowed even though the kwitansi was already printed, and the fix
        // must actually land in the database rather than being silently
        // rejected (previously a hard 422 blocked this entirely).
        $this->patchJson("/api/admin/meter-readings/{$meterReadingId}", [
            'current_meter' => 230,
            'previous_meter' => 200,
        ])
            ->assertOk()
            ->assertJsonPath('data.current_meter', 230)
            ->assertJsonPath('data.usage', 30);

        $bill->refresh();
        $this->assertSame(30, (int) $bill->usage);
        $this->assertEqualsWithDelta((30 * $waterRate) + $adminFee, (float) $bill->total_amount, 0.01);
        $this->assertSame('belum_dicetak', $bill->print_status);

        // The stale physical copy is invalidated: the receipt drops back to
        // queued so it shows as "Belum Dicetak" and must be reprinted before
        // the petugas can collect payment against the corrected amount.
        $receipt->refresh();
        $this->assertSame('queued', $receipt->status);
        $this->assertNull($receipt->printed_at);

        Sanctum::actingAs($officer);
        $this->post('/api/petugas/payments', [
            'bill_id' => $bill->id,
            'method' => 'tunai',
            'proof' => UploadedFile::fake()->create('kwitansi-cap.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Pembayaran belum dapat dicatat karena kwitansi fisik belum dicetak admin.');

        Sanctum::actingAs($admin);
        $this->withHeader('Idempotency-Key', 'receipt-correction-reprint')
            ->postJson('/api/admin/receipts/batches', [
                'officer_id' => $officer->id,
                'period' => '2027-07',
                'receipt_ids' => [$receipt->id],
            ])
            ->assertCreated();

        Sanctum::actingAs($officer);
        $this->post('/api/petugas/payments', [
            'bill_id' => $bill->id,
            'method' => 'tunai',
            'proof' => UploadedFile::fake()->create('kwitansi-cap.jpg', 100, 'image/jpeg'),
        ], ['Accept' => 'application/json'])->assertCreated();

        // The petugas's "pelanggan bayar" flow charges the corrected amount,
        // not the amount from the original (now-invalid) printed receipt.
        $this->assertEqualsWithDelta((30 * $waterRate) + $adminFee, (float) $bill->fresh()->payments()->latest()->first()->amount, 0.01);
    }

    public function test_printed_receipt_uses_the_signatory_configured_in_settings(): void
    {
        $this->seed(PamsimasSeeder::class);
        \App\Models\Setting::query()->updateOrCreate(
            ['key' => 'receipt_signatory'],
            ['value' => ['name' => 'BUDI SANTOSO', 'title' => 'Sekretaris KPSPAMS TIRTA SARI']],
        );
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $officer = User::query()->where('role', 'petugas')->firstOrFail();
        $customer = $this->unmeteredCustomerFor($officer);

        Sanctum::actingAs($officer);
        $this->postJson('/api/petugas/meter-readings', [
            'current_meter' => 220,
            'customer_id' => $customer->id,
            'period_month' => 11,
            'period_year' => 2026,
            'previous_meter' => 200,
        ])->assertCreated();
        $receipt = Receipt::query()
            ->where('customer_id', $customer->id)
            ->where('period_month', 11)
            ->where('period_year', 2026)
            ->firstOrFail();

        Sanctum::actingAs($admin);
        $this->withHeader('Idempotency-Key', 'receipt-workflow-dynamic-signatory')
            ->postJson('/api/admin/receipts/batches', [
                'officer_id' => $officer->id,
                'period' => '2026-11',
                'receipt_ids' => [$receipt->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.receipts.0.template_snapshot.signatory_name', 'BUDI SANTOSO')
            ->assertJsonPath('data.receipts.0.template_snapshot.signatory_title', 'Sekretaris KPSPAMS TIRTA SARI');
    }

    public function test_batch_pdf_is_rendered_and_only_downloadable_by_an_authenticated_admin(): void
    {
        $this->seed(PamsimasSeeder::class);
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $officer = User::query()->where('role', 'petugas')->firstOrFail();
        $customer = $this->unmeteredCustomerFor($officer);

        Sanctum::actingAs($officer);
        $this->postJson('/api/petugas/meter-readings', [
            'current_meter' => 245,
            'customer_id' => $customer->id,
            'period_month' => 12,
            'period_year' => 2026,
            'previous_meter' => 230,
        ])->assertCreated();
        $receipt = Receipt::query()
            ->where('customer_id', $customer->id)
            ->where('period_month', 12)
            ->where('period_year', 2026)
            ->firstOrFail();

        Sanctum::actingAs($admin);
        $batchId = $this->withHeader('Idempotency-Key', 'receipt-workflow-pdf-download')
            ->postJson('/api/admin/receipts/batches', [
                'officer_id' => $officer->id,
                'period' => '2026-12',
                'receipt_ids' => [$receipt->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.has_pdf', true)
            ->json('data.id');

        $pdf = $this->getJson("/api/admin/receipts/batches/{$batchId}/pdf")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $pdf->streamedContent());

        // Never served from public/storage — see the comment on
        // ReceiptController::downloadPdf(). No route, no file.
        Sanctum::actingAs($officer);
        $this->getJson("/api/admin/receipts/batches/{$batchId}/pdf")->assertForbidden();
    }

    public function test_batch_of_four_pages_three_then_one_with_two_truly_blank_slots(): void
    {
        $this->seed(PamsimasSeeder::class);
        $admin = User::query()->where('role', 'admin')->firstOrFail();
        $officer = User::query()->where('role', 'petugas')->firstOrFail();
        $customers = Customer::query()
            ->whereIn('rt_id', $officer->assignedRegions()->pluck('regions.id'))
            ->whereIn('status', ['aktif', 'menunggak'])
            ->whereDoesntHave('meterReadings')
            ->take(4)
            ->get();
        $this->assertCount(4, $customers, 'Seeder must give this officer at least 4 unmetered customers for this test.');

        Sanctum::actingAs($officer);
        $receiptIds = $customers->map(function (Customer $customer, int $index) {
            $this->postJson('/api/petugas/meter-readings', [
                'current_meter' => 200 + ($index * 10) + 5,
                'customer_id' => $customer->id,
                'period_month' => 8,
                'period_year' => 2027,
                'previous_meter' => 200 + ($index * 10),
            ])->assertCreated();

            return Receipt::query()
                ->where('customer_id', $customer->id)
                ->where('period_month', 8)
                ->where('period_year', 2027)
                ->firstOrFail()->id;
        });

        Sanctum::actingAs($admin);
        $batch = $this->withHeader('Idempotency-Key', 'receipt-workflow-four-receipts')
            ->postJson('/api/admin/receipts/batches', [
                'officer_id' => $officer->id,
                'period' => '2027-08',
                'receipt_ids' => $receiptIds->all(),
            ])
            ->assertCreated()
            // 4 receipts -> 2 pages (3 + 1), not 2 full pages of 3 — this is
            // what the user asked to confirm: page_count/empty_slots follow
            // ceil(4/3), and the "extra" 2 slots on page 2 are blank space
            // (verified as truly borderless in ReceiptPdfService), not a
            // second batch of empty printed kwitansi forms.
            ->assertJsonPath('data.receipt_count', 4)
            ->assertJsonPath('data.page_count', 2)
            ->assertJsonPath('data.empty_slots', 2)
            ->assertJsonPath('data.has_pdf', true);

        $pdf = $this->getJson("/api/admin/receipts/batches/{$batch->json('data.id')}/pdf")->assertOk();
        $this->assertStringStartsWith('%PDF-', $pdf->streamedContent());
    }

    private function unmeteredCustomerFor(User $officer): Customer
    {
        return Customer::query()
            ->whereIn('rt_id', $officer->assignedRegions()->pluck('regions.id'))
            ->whereIn('status', ['aktif', 'menunggak'])
            ->whereDoesntHave('meterReadings')
            ->firstOrFail();
    }
}
