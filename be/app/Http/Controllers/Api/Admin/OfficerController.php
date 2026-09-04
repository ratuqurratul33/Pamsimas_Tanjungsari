<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\StoreOfficerRequest;
use App\Http\Requests\Api\Admin\UpdateOfficerRequest;
use App\Models\Bill;
use App\Models\Customer;
use App\Models\OfficerDeposit;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class OfficerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $officers = User::query()
            ->where('role', 'petugas')
            ->with(['assignedRegions.parent.parent'])
            ->when($request->search, function ($query, string $search) {
                $query->where(function ($nestedQuery) use ($search) {
                    $nestedQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('username', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->get()
            ->map(fn (User $officer) => $this->formatOfficer($officer));

        return response()->json(['data' => $officers]);
    }

    public function store(StoreOfficerRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $photoPath = $request->file('photo')?->store('officer-photos', 'public');

        $officer = User::create([
            'avatar' => $this->makeAvatar($validated['name']),
            'email' => $validated['username'].'@pamsimas.local',
            'gender' => $validated['gender'] ?? null,
            'name' => $validated['name'],
            'password' => Hash::make($validated['phone']),
            'phone' => $validated['phone'],
            'photo_path' => $photoPath,
            'role' => 'petugas',
            'status' => $validated['status'],
            'username' => $validated['username'],
        ]);

        $officer->assignedRegions()->sync($validated['region_ids']);

        return response()->json($this->formatOfficer($officer->fresh(['assignedRegions.parent.parent'])), 201);
    }

    public function show(User $officer): JsonResponse
    {
        abort_unless($officer->role === 'petugas', 404);
        $officer->load(['assignedRegions.parent.parent']);
        $data = $this->formatOfficer($officer);
        $period = Setting::query()->where('key', 'billing_period')->value('value') ?? [];
        $month = (int) ($period['month'] ?? now()->month);
        $year = (int) ($period['year'] ?? now()->year);
        $customerIds = Customer::query()->whereIn('rt_id', $officer->assignedRegions->pluck('id'))->pluck('id');
        $deposits = OfficerDeposit::query()
            ->where('officer_id', $officer->id)
            ->withCount('payments')
            ->latest('submitted_at')
            ->get();

        $data['summary'] = [
            'customers' => $customerIds->count(),
            'pending_deposit' => (int) round((float) $deposits->where('status', 'pending')->sum('total_amount')),
            'total_bill' => (int) round((float) Bill::query()
                ->whereIn('customer_id', $customerIds)
                ->where('period_month', $month)
                ->where('period_year', $year)
                ->sum('total_amount')),
            'verified_deposit' => (int) round((float) $deposits
                ->where('status', 'verified')
                ->where('period_month', $month)
                ->where('period_year', $year)
                ->sum('received_amount')),
        ];
        $data['deposits'] = $deposits->map(fn (OfficerDeposit $deposit) => [
            'cash' => (int) round((float) $deposit->cash_total),
            'customer_count' => (int) $deposit->payments_count,
            'date' => $deposit->submitted_at?->toIso8601String(),
            'id' => $deposit->id,
            'period' => sprintf('%04d-%02d', $deposit->period_year, $deposit->period_month),
            'qris' => (int) round((float) $deposit->qris_total),
            'status' => $deposit->status,
            'total' => (int) round((float) $deposit->total_amount),
        ])->values();

        return response()->json(['data' => $data]);
    }

    public function update(UpdateOfficerRequest $request, User $officer): JsonResponse
    {
        abort_unless($officer->role === 'petugas', 404);

        $validated = $request->validated();
        $photoPath = $request->file('photo')?->store('officer-photos', 'public');
        $phoneChanged = array_key_exists('phone', $validated) && $validated['phone'] !== $officer->phone;

        $officer->update([
            ...collect($validated)->except(['photo', 'region_ids'])->all(),
            'email' => isset($validated['username']) ? $validated['username'].'@pamsimas.local' : $officer->email,
            'password' => $phoneChanged ? Hash::make($validated['phone']) : $officer->password,
            'photo_path' => $photoPath ?? $officer->photo_path,
        ]);

        if (array_key_exists('region_ids', $validated)) {
            $officer->assignedRegions()->sync($validated['region_ids']);
        }

        return response()->json($this->formatOfficer($officer->fresh(['assignedRegions.parent.parent'])));
    }

    public function destroy(User $officer): JsonResponse
    {
        abort_unless($officer->role === 'petugas', 404);

        $officer->update(['status' => 'nonaktif']);

        return response()->json(['message' => 'Petugas berhasil dinonaktifkan.']);
    }

    private function formatOfficer(User $officer): array
    {
        $regions = $officer->assignedRegions;
        $regionIds = $regions->pluck('id');
        $customerCounts = Customer::query()
            ->selectRaw('rt_id, COUNT(*) as total')
            ->whereIn('rt_id', $regionIds)
            ->groupBy('rt_id')
            ->pluck('total', 'rt_id');

        return [
            'id' => $officer->id,
            'officer_code' => 'PTG-'.str_pad((string) $officer->id, 3, '0', STR_PAD_LEFT),
            'name' => $officer->name,
            'username' => $officer->username,
            'phone' => $officer->phone,
            'gender' => $officer->gender,
            'photo_url' => $officer->photo_path ? asset('storage/'.$officer->photo_path) : null,
            'status' => $officer->status,
            'customers_count' => (int) $customerCounts->sum(),
            'regions' => $regions->map(function ($region) use ($customerCounts) {
                $rw = $region->parent;
                $dusun = $rw?->parent;

                return [
                    'capacity_households' => (int) $customerCounts->get($region->id, 0),
                    'dusun' => $dusun?->name,
                    'households' => (int) $customerCounts->get($region->id, 0),
                    'id' => $region->id,
                    'kampung' => $region->kampung,
                    'name' => $region->name,
                    'rt' => $region->code,
                    'rw' => $rw?->code ?? $rw?->name,
                ];
            })->values(),
        ];
    }

    private function makeAvatar(string $name): string
    {
        return collect(explode(' ', $name))
            ->filter()
            ->take(2)
            ->map(fn ($part) => mb_substr($part, 0, 1))
            ->join('');
    }
}
