<?php

namespace App\Http\Controllers\Api\Publik;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\Customer;
use App\Models\Faq;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class ContentController extends Controller
{
    public function summary(): JsonResponse
    {
        $servedCustomers = Customer::query()->where('status', '!=', 'nonaktif');
        $activeCustomers = (clone $servedCustomers)->count();
        $period = Setting::query()->where('key', 'billing_period')->value('value') ?? [];
        $month = (int) ($period['month'] ?? now()->month);
        $year = (int) ($period['year'] ?? now()->year);
        $billedCustomers = Bill::query()
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->distinct('customer_id')
            ->count('customer_id');
        $overdueCustomers = Bill::query()
            ->where('period_month', $month)
            ->where('period_year', $year)
            ->where('payment_status', '!=', 'lunas')
            ->whereDate('due_date', '<', now()->toDateString())
            ->distinct('customer_id')
            ->count('customer_id');
        $servedAreas = (clone $servedCustomers)
            ->whereNotNull('dusun_id')
            ->with('dusun:id,name')
            ->get()
            ->pluck('dusun.name')
            ->filter()
            ->unique()
            ->sort()
            ->values();

        return response()->json([
            'data' => [
                'active_customers' => $activeCustomers,
                'overdue_percentage' => $billedCustomers > 0
                    ? (int) round(($overdueCustomers / $billedCustomers) * 100)
                    : 0,
                'served_areas' => $servedAreas,
            ],
        ]);
    }

    public function faqs(): JsonResponse
    {
        return response()->json([
            'data' => Faq::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'question', 'answer', 'category', 'sort_order']),
        ]);
    }
}
