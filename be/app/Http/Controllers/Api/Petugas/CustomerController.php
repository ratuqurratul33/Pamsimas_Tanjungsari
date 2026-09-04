<?php

namespace App\Http\Controllers\Api\Petugas;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Setting;
use App\Support\FieldCustomerPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);
        $regionIds = $request->user()->assignedRegions()->pluck('regions.id');
        // Resolved once here and threaded through so FieldCustomerPresenter
        // doesn't re-query the settings table for every customer on the page.
        $period = Setting::query()->where('key', 'billing_period')->value('value') ?? [];

        $customers = Customer::query()
            ->with([
                'dusun',
                'rt.parent',
                // FieldCustomerPresenter needs every reading (for meterHistory) plus
                // each reading's bill/payments/deposit (for status + the current
                // period's amounts). Loading it here, once per page, is what lets
                // the presenter skip a per-customer query below.
                'meterReadings' => fn ($query) => $query
                    ->with('bill.payments.deposit')
                    ->orderBy('period_year')
                    ->orderBy('period_month'),
            ])
            ->whereIn('rt_id', $regionIds)
            ->when($validated['search'] ?? null, function ($query, $search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('name', 'like', "%{$search}%")
                        ->orWhere('customer_code', 'like', "%{$search}%")
                        ->orWhere('address', 'like', "%{$search}%");
                });
            })
            ->orderBy('customer_code')
            ->paginate(min((int) ($validated['per_page'] ?? 25), 100));

        return response()->json([
            'data' => $customers->getCollection()->map(fn (Customer $customer) => FieldCustomerPresenter::make($customer, $period)),
            'meta' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
        ]);
    }
}
