<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Region;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class RegionController extends Controller
{
    /**
     * Creates a Dusun, RW, or RT/Kampung entry. Dusun has no parent; RW must
     * be parented to a Dusun; RT (which also carries the Kampung name) must
     * be parented to an RW. This lets admins add wilayah data on the fly
     * instead of being stuck with whatever was originally seeded.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:50'],
            'kampung' => ['nullable', 'string', 'max:255', 'required_if:type,rt'],
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'required_unless:type,dusun', 'exists:regions,id'],
            'type' => ['required', Rule::in(['dusun', 'rw', 'rt'])],
        ]);

        $expectedParentType = ['rw' => 'dusun', 'rt' => 'rw'][$validated['type']] ?? null;

        if ($expectedParentType) {
            $parent = Region::query()->find($validated['parent_id']);

            if (! $parent || $parent->type !== $expectedParentType) {
                throw ValidationException::withMessages([
                    'parent_id' => ["Induk wilayah harus berupa {$expectedParentType}."],
                ]);
            }
        }

        $region = Region::create([
            'code' => $validated['code'] ?? null,
            'kampung' => $validated['kampung'] ?? null,
            'name' => $validated['name'],
            'parent_id' => $validated['parent_id'] ?? null,
            'type' => $validated['type'],
        ]);

        return response()->json(['data' => $region], 201);
    }

    /**
     * Flat list of Dusun and RW entries, used to populate the "induk
     * wilayah" pickers when the admin adds a new RW (needs a Dusun) or a
     * new RT/Kampung (needs an RW).
     */
    public function parents(): JsonResponse
    {
        $regions = Region::query()
            ->whereIn('type', ['dusun', 'rw'])
            ->with('parent')
            ->orderBy('type')
            ->orderBy('name')
            ->get()
            ->map(fn (Region $region) => [
                'dusun_name' => $region->type === 'rw' ? $region->parent?->name : null,
                'id' => $region->id,
                'name' => $region->name,
                'type' => $region->type,
            ]);

        return response()->json(['data' => $regions]);
    }

    public function index(): JsonResponse
    {
        $assignedRegionIds = User::query()
            ->where('role', 'petugas')
            ->where('status', 'aktif')
            ->with('assignedRegions:id')
            ->get()
            ->flatMap(fn (User $officer) => $officer->assignedRegions->pluck('id'))
            ->unique()
            ->values();

        $customerCounts = Customer::query()
            ->selectRaw('rt_id, COUNT(*) as total')
            ->whereNotNull('rt_id')
            ->groupBy('rt_id')
            ->pluck('total', 'rt_id');

        $regions = Region::query()
            ->where('type', 'rt')
            ->with('parent.parent')
            ->orderBy('parent_id')
            ->orderBy('code')
            ->get()
            ->map(function (Region $region) use ($assignedRegionIds, $customerCounts) {
                $rw = $region->parent;
                $dusun = $rw?->parent;

                return [
                    'capacity_households' => (int) $customerCounts->get($region->id, 0),
                    'dusun' => $dusun?->name,
                    'dusun_id' => $dusun?->id,
                    'households' => (int) $customerCounts->get($region->id, 0),
                    'id' => $region->id,
                    'is_assigned' => $assignedRegionIds->contains($region->id),
                    'kampung' => $region->kampung,
                    'name' => $region->name,
                    'rt' => $region->code,
                    'rw' => $rw?->code ?? $rw?->name,
                ];
            });

        return response()->json(['data' => $regions]);
    }
}
