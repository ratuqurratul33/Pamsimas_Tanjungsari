<?php

namespace App\Support;

use App\Models\Customer;
use App\Models\Setting;

final class FieldCustomerPresenter
{
    /**
     * @param  array|null  $period  Pass the resolved `billing_period` setting
     *                              when mapping over a list so it's looked up
     *                              once per page instead of once per row.
     */
    public static function make(Customer $customer, ?array $period = null): array
    {
        $customer->loadMissing(['dusun', 'rt.parent']);
        // meterReadings + nested bill/payments/deposit are loaded once per
        // *page* by the caller (see Petugas\CustomerController::index) via
        // eager loading; loadMissing here only fires a query in the
        // single-customer call sites (after ->fresh(), which drops loaded
        // relations) so neither path N+1's per row.
        if (! $customer->relationLoaded('meterReadings')) {
            $customer->load(['meterReadings' => fn ($query) => $query
                ->with('bill.payments.deposit')
                ->orderBy('period_year')
                ->orderBy('period_month')]);
        }
        $period ??= Setting::query()->where('key', 'billing_period')->value('value') ?? [];
        $periodMonth = (int) ($period['month'] ?? now()->month);
        $periodYear = (int) ($period['year'] ?? now()->year);
        $readings = $customer->meterReadings;
        $currentReading = $readings->first(fn ($reading) => (int) $reading->period_year === $periodYear && (int) $reading->period_month === $periodMonth);
        $bill = $currentReading?->bill;
        $meter = $currentReading;
        $payment = $bill?->payments->sortByDesc('paid_at')->first();
        $billStatus = self::statusFor($bill, $payment);
        $depositStatus = match (true) {
            ! $payment || $payment->status === 'rejected' => null,
            $payment->deposit?->status === 'verified' => 'Terverifikasi',
            $payment->deposit?->status === 'pending' => 'Menunggu Verifikasi',
            default => 'Belum Disetorkan',
        };
        $rt = $customer->rt;
        $rw = $rt?->parent;

        return [
            'address' => $customer->address,
            'backendId' => $customer->id,
            'baseBillAmount' => (float) ($bill?->total_amount ?? 0),
            'billAmount' => (float) ($bill?->amountDue() ?? 0),
            'billId' => $bill?->id,
            'billingPeriod' => $bill ? sprintf('%04d-%02d', $bill->period_year, $bill->period_month) : null,
            'lateFeeAmount' => (float) ($bill?->lateFeeAmount() ?? 0),
            'billStatus' => $billStatus,
            'currentMeter' => (int) ($meter?->current_meter ?? 0),
            'dusun' => $customer->dusun?->name ?? 'Dusun 3',
            'id' => $customer->customer_code,
            'kampung' => $rt?->kampung ?? '-',
            'lastMeter' => (int) ($meter?->previous_meter ?? 0),
            'meterHistory' => $readings
                ->map(function ($reading) {
                    $readingPayment = $reading->bill?->payments->sortByDesc('paid_at')->first();

                    return [
                        'baseBillAmount' => (float) ($reading->bill?->total_amount ?? 0),
                        'billAmount' => (float) ($reading->bill?->amountDue() ?? 0),
                        'billId' => $reading->bill?->id,
                        'lateFeeAmount' => (float) ($reading->bill?->lateFeeAmount() ?? 0),
                        'currentMeter' => (int) $reading->current_meter,
                        'paymentId' => $readingPayment?->id,
                        'paymentMethod' => $readingPayment ? ucfirst($readingPayment->method) : null,
                        'paymentProofPreview' => $readingPayment?->proof_path ? asset('storage/'.$readingPayment->proof_path) : null,
                        'period' => sprintf('%04d-%02d', $reading->period_year, $reading->period_month),
                        'previousMeter' => (int) $reading->previous_meter,
                        'qrisProofPreview' => $readingPayment?->qris_proof_path ? asset('storage/'.$readingPayment->qris_proof_path) : null,
                        'status' => self::statusFor($reading->bill, $readingPayment),
                        'submittedAt' => optional($reading->recorded_at)->toDateString(),
                        'usage' => (int) $reading->usage,
                    ];
                })->values(),
            'meterStatus' => $meter ? 'Sudah Dicatat' : 'Belum Dicatat',
            'meterSubmittedAt' => optional($meter?->recorded_at)->toDateString(),
            'name' => $customer->name,
            'depositStatus' => $depositStatus,
            'paymentId' => $payment?->id,
            'paymentMethod' => $payment ? ucfirst($payment->method) : null,
            'paymentProofName' => $payment?->proof_path ? basename($payment->proof_path) : null,
            'paymentProofPreview' => $payment?->proof_path ? asset('storage/'.$payment->proof_path) : null,
            'qrisProofName' => $payment?->qris_proof_path ? basename($payment->qris_proof_path) : null,
            'qrisProofPreview' => $payment?->qris_proof_path ? asset('storage/'.$payment->qris_proof_path) : null,
            'rt' => $rt?->code ?? 'RT -',
            'rw' => $rw?->code ?? 'RW -',
            'zone' => trim(($customer->dusun?->name ?? 'Dusun').' / '.($rw?->code ?? '').' / '.($rt?->code ?? '').' - '.($rt?->kampung ?? '-')),
        ];
    }

    private static function statusFor(?\App\Models\Bill $bill, ?\App\Models\Payment $payment): string
    {
        return match (true) {
            ! $bill => 'Belum Ada Tagihan',
            $bill->payment_status === 'lunas', $payment?->status === 'verified' => 'Lunas',
            $payment?->status === 'pending' => 'Sudah Membayar',
            default => 'Menunggak',
        };
    }
}
