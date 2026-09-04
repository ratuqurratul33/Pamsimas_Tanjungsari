<?php

namespace App\Http\Controllers\Api\Petugas;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Petugas\StoreMeterReadingRequest;
use App\Models\Bill;
use App\Models\Customer;
use App\Models\MeterReading;
use App\Models\Setting;
use App\Models\Tariff;
use Carbon\Carbon;
use App\Services\ReceiptBatchService;
use App\Support\FieldCustomerPresenter;
use App\Support\RealtimeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MeterReadingController extends Controller
{
    public function __construct(private readonly ReceiptBatchService $receiptService) {}

    public function store(StoreMeterReadingRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $customer = Customer::findOrFail($validated['customer_id']);
        abort_unless($request->user()->canAccessCustomer($customer), 403, 'Pelanggan tidak berada di wilayah tugas Anda.');
        $previousReading = $customer->meterReadings()
            ->where(function ($query) use ($validated) {
                $query->where('period_year', '<', $validated['period_year'])
                    ->orWhere(function ($periodQuery) use ($validated) {
                        $periodQuery->where('period_year', $validated['period_year'])
                            ->where('period_month', '<', $validated['period_month']);
                    });
            })
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->first();
        if (! $previousReading && ! array_key_exists('previous_meter', $validated)) {
            throw ValidationException::withMessages([
                'previous_meter' => 'Meter awal wajib diisi untuk pencatatan pelanggan yang pertama kali.',
            ]);
        }

        $alreadyRecorded = $customer->meterReadings()
            ->where('period_year', $validated['period_year'])
            ->where('period_month', $validated['period_month'])
            ->exists();
        if ($alreadyRecorded) {
            throw ValidationException::withMessages([
                'period_month' => 'Meter pelanggan untuk periode ini sudah pernah dicatat.',
            ]);
        }

        $previousMeter = (int) ($previousReading?->current_meter ?? $validated['previous_meter'] ?? 0);
        abort_if($validated['current_meter'] < $previousMeter, 422, 'Meter saat ini tidak boleh lebih kecil dari meter periode sebelumnya.');
        $usage = max($validated['current_meter'] - $previousMeter, 0);
        $tariff = Tariff::where('is_active', true)->latest('effective_from')->firstOrFail();
        $waterRate = (float) $tariff->water_rate_per_m3;
        $adminFee = (float) $tariff->admin_fee;

        $reading = DB::transaction(function () use ($validated, $previousMeter, $usage, $waterRate, $adminFee, $tariff, $request) {
            $reading = MeterReading::create([
                ...$validated,
                'officer_id' => $request->user()->id,
                'previous_meter' => $previousMeter,
                'recorded_at' => $validated['recorded_at'] ?? now(),
                'usage' => $usage,
            ]);

            $billingSettings = Setting::where('key', 'billing_period')->value('value') ?? [];
            $dueDay = (int) ($billingSettings['due_day'] ?? 25);
            $daysInMonth = Carbon::create($validated['period_year'], $validated['period_month'], 1)->daysInMonth;
            $dueDate = Carbon::create($validated['period_year'], $validated['period_month'], min(max($dueDay, 1), $daysInMonth));

            $bill = Bill::create([
                'admin_fee' => $adminFee,
                'customer_id' => $validated['customer_id'],
                'due_date' => $dueDate,
                'invoice_number' => sprintf('INV-%04d%02d-%04d', $validated['period_year'], $validated['period_month'], $validated['customer_id']),
                'meter_reading_id' => $reading->id,
                'period_month' => $validated['period_month'],
                'period_year' => $validated['period_year'],
                'tariff_id' => $tariff->id,
                'total_amount' => ($usage * $waterRate) + $adminFee,
                'usage' => $usage,
                'water_rate' => $waterRate,
                'payment_status' => 'belum_lunas',
            ]);

            $this->receiptService->queueForBill($bill);

            return $reading;
        });

        RealtimeNotifier::updated(['field', 'receipts', 'dashboard', 'public-summary'], 'petugas.meter_reading.created');

        return response()->json(['data' => FieldCustomerPresenter::make($customer->fresh())], 201);
    }
}
