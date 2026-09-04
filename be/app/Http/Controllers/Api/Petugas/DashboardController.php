<?php

namespace App\Http\Controllers\Api\Petugas;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\Customer;
use App\Models\OfficerDeposit;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Tariff;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $officer = auth()->user();
        $regionIds = $officer->assignedRegions()->pluck('regions.id');
        $customerIds = Customer::whereIn('rt_id', $regionIds)->pluck('id');
        $period = Setting::query()->where('key', 'billing_period')->value('value') ?? [];
        $month = (int) ($period['month'] ?? now()->month);
        $year = (int) ($period['year'] ?? now()->year);
        $bills = Bill::whereIn('customer_id', $customerIds)->where('period_month', $month)->where('period_year', $year)->get();
        $pendingPayments = Payment::query()->where('officer_id', $officer->id)->whereNull('officer_deposit_id')->where('status', 'pending')->sum('amount');
        $tariff = Tariff::query()->where('is_active', true)->latest('effective_from')->first();
        $lateFee = Setting::query()->where('key', 'late_fee')->value('value');

        return response()->json([
            'data' => [
                'assigned_customers' => $customerIds->count(),
                'monthly_bill_total' => (float) $bills->sum('total_amount'),
                'paid_customers' => $bills->where('payment_status', 'lunas')->count(),
                'pending_deposit_amount' => (int) round((float) $pendingPayments),
                'pending_verification_amount' => (int) round((float) OfficerDeposit::query()->where('officer_id', $officer->id)->where('status', 'pending')->sum('total_amount')),
                'period' => sprintf('%04d-%02d', $year, $month),
                'recorded_meters' => $bills->whereIn('payment_status', ['sudah_input_meter', 'belum_lunas', 'menunggu_verifikasi', 'lunas'])->count(),
                'water_rate_per_m3' => (float) ($tariff->water_rate_per_m3 ?? 0),
                'admin_fee' => (float) ($tariff->admin_fee ?? 0),
                'late_fee' => (float) ($lateFee ?? 0),
                'due_day' => (int) ($period['due_day'] ?? 25),
            ],
        ]);
    }
}
