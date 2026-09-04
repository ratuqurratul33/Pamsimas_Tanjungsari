<?php

namespace App\Http\Controllers\Api\Publik;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransparencyController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'include_customers' => ['nullable', 'boolean'],
            'month' => ['nullable', 'integer', 'between:1,12'],
            'year' => ['nullable', 'integer', 'min:2020'],
        ]);
        $month = (int) ($validated['month'] ?? now()->month);
        $year = (int) ($validated['year'] ?? now()->year);
        $includeCustomers = (bool) ($validated['include_customers'] ?? false) && $request->user()?->role === 'admin';

        $customers = Customer::query()
            ->where('status', 'aktif')
            ->with([
                'dusun',
                'rt.parent',
                'bills' => fn ($query) => $query
                    ->where('period_month', $month)
                    ->where('period_year', $year)
                    ->with('payments'),
            ])
            ->get();

        $regions = $customers
            ->filter(fn (Customer $customer) => $customer->bills->isNotEmpty())
            ->groupBy(fn (Customer $customer) => $customer->dusun?->name ?? 'Wilayah Lain')
            ->map(function ($dusunCustomers, string $dusun) use ($includeCustomers) {
                $rtRows = $dusunCustomers
                    ->groupBy(function (Customer $customer) {
                        $rt = $customer->rt;

                        return implode('|', [$rt?->parent?->code ?? 'RW -', $rt?->code ?? 'RT -', $rt?->kampung ?? '-']);
                    })
                    ->map(function ($rtCustomers, string $key) use ($includeCustomers) {
                        [$rw, $rt, $kampung] = explode('|', $key);
                        $bills = $rtCustomers->flatMap(fn (Customer $customer) => $customer->bills);
                        $paid = $bills->filter(fn ($bill) => $bill->payments->contains('status', 'verified'))->count();
                        $total = $bills->count();

                        $row = [
                            'bill_total' => (float) $bills->sum('total_amount'),
                            'kampung' => $kampung,
                            'paid' => $paid,
                            'percentage' => $total > 0 ? round(($paid / $total) * 100) : 0,
                            'rt' => $rt,
                            'rw' => $rw,
                            'total' => $total,
                        ];

                        if ($includeCustomers) {
                            $row['customers'] = $rtCustomers->map(function (Customer $customer) {
                                $bill = $customer->bills->first();

                                return [
                                    'address' => $customer->address,
                                    'bill_amount' => (int) round((float) ($bill?->total_amount ?? 0)),
                                    'customer_id' => $customer->customer_code,
                                    'customer_name' => $customer->name,
                                    'paid' => (bool) $bill?->payments->contains('status', 'verified'),
                                ];
                            })->values();
                        }

                        return $row;
                    })->values();
                $paid = $rtRows->sum('paid');
                $total = $rtRows->sum('total');

                return [
                    'bill_total' => (float) $dusunCustomers->flatMap(fn (Customer $customer) => $customer->bills)->sum('total_amount'),
                    'name' => $dusun,
                    'paid' => $paid,
                    'percentage' => $total > 0 ? round(($paid / $total) * 100) : 0,
                    'rts' => $rtRows,
                    'total' => $total,
                    'unpaid' => $total - $paid,
                ];
            })->values();

        return response()->json([
            'data' => [
                'is_final' => now()->year !== $year || now()->month !== $month,
                'period' => ['month' => $month, 'year' => $year],
                'regions' => $regions,
                'recent_expenses' => Expense::query()
                    ->whereYear('expense_date', $year)
                    ->whereMonth('expense_date', $month)
                    ->where('status', 'posted')
                    ->where('is_public', true)
                    ->latest('expense_date')
                    ->limit(15)
                    ->get(['amount', 'category', 'description', 'expense_date'])
                    // The amount column casts to decimal:2, which Eloquent
                    // serializes as a string ("27000.00") to avoid float
                    // rounding. Cast it to a real number here so every
                    // consumer of this endpoint gets a proper JSON number
                    // instead of having to remember to coerce it themselves.
                    ->map(function (Expense $expense) {
                        $expense->amount = (int) round((float) $expense->amount);

                        return $expense;
                    }),
            ],
        ]);
    }
}
