<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\StoreCustomerRequest;
use App\Http\Requests\Api\Admin\UpdateCustomerRequest;
use App\Models\Bill;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dusun_id' => ['nullable', 'integer', 'exists:regions,id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:aktif,menunggak,nonaktif'],
        ]);
        $customers = Customer::query()
            ->with(['dusun', 'rt.parent'])
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($nested) use ($search) {
                    $nested->where('name', 'like', "%{$search}%")
                        ->orWhere('customer_code', 'like', "%{$search}%")
                        ->orWhere('address', 'like', "%{$search}%");
                });
            })
            ->when($validated['dusun_id'] ?? null, fn ($query, $dusunId) => $query->where('dusun_id', $dusunId))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->paginate(min((int) ($validated['per_page'] ?? 15), 100));

        return response()->json([
            ...$customers->toArray(),
            'summary' => [
                'active' => Customer::query()->where('status', 'aktif')->count(),
                'attention' => Customer::query()->where('status', '!=', 'aktif')->count(),
                'total' => Customer::query()->count(),
            ],
        ]);
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = Customer::create([
            ...$request->validated(),
            'customer_code' => Customer::nextCustomerCode(),
        ]);

        return response()->json($customer->load(['dusun', 'rt.parent']), 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer->load([
            'dusun',
            'rt.parent',
            'bills' => fn ($query) => $query
                ->with(['meterReading', 'payments', 'receipts'])
                ->orderByDesc('period_year')
                ->orderByDesc('period_month'),
        ]);
        $history = $customer->bills->map(fn (Bill $bill) => $this->formatBill($bill));

        return response()->json([
            'data' => [
                'customer' => [
                    'address' => $customer->address,
                    'customer_code' => $customer->customer_code,
                    'dusun' => $customer->dusun?->name,
                    'joined_at' => $customer->joined_at?->toDateString(),
                    'kampung' => $customer->rt?->kampung,
                    'name' => $customer->name,
                    'rt' => $customer->rt?->code ?? $customer->rt?->name,
                    'rw' => $customer->rt?->parent?->code ?? $customer->rt?->parent?->name,
                    'status' => $customer->status,
                ],
                'current_bill' => $history->first(),
                'history' => $history,
            ],
        ]);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer->update($request->validated());

        return response()->json($customer->fresh(['dusun', 'rt.parent']));
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $customer->delete();

        return response()->json(['message' => 'Pelanggan berhasil dihapus']);
    }

    private function formatBill(Bill $bill): array
    {
        $payment = $bill->payments->sortByDesc('paid_at')->first();
        $meter = $bill->meterReading;

        return [
            'amount' => (int) round((float) $bill->amountDue()),
            'base_amount' => (int) round((float) $bill->total_amount),
            'deposit_id' => $payment?->officer_deposit_id,
            'invoice_number' => $bill->invoice_number,
            'late_fee' => (int) round((float) $bill->lateFeeAmount()),
            'meter_current' => (int) ($meter?->current_meter ?? 0),
            'meter_previous' => (int) ($meter?->previous_meter ?? 0),
            'paid_at' => $payment?->paid_at?->toIso8601String(),
            'payment_method' => $payment?->method,
            'period' => sprintf('%04d-%02d', $bill->period_year, $bill->period_month),
            'print_status' => $bill->print_status,
            'status' => $bill->payment_status,
            'usage' => (int) $bill->usage,
        ];
    }
}
