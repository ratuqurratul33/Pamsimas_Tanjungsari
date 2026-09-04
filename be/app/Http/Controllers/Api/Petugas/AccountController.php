<?php

namespace App\Http\Controllers\Api\Petugas;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $officer = $request->user()->load('assignedRegions.parent.parent');
        $areas = $officer->assignedRegions->map(function ($region) {
            $rw = $region->parent;
            $dusun = $rw?->parent;

            return trim(sprintf(
                '%s / %s / %s - %s',
                $dusun?->name ?? 'Dusun',
                $rw?->code ?? $rw?->name ?? 'RW',
                $region->code ?? $region->name,
                $region->kampung ?? '-'
            ));
        })->values();

        return response()->json([
            'data' => [
                'area' => $areas->isEmpty() ? 'Belum ada wilayah tugas' : $areas->join(', '),
                'areas' => $areas,
                'avatar' => $officer->avatar,
                'gender' => $officer->gender,
                'name' => $officer->name,
                'phone' => $officer->phone,
                'photo_url' => $officer->photo_path ? asset('storage/'.$officer->photo_path) : null,
                'role' => 'Petugas Penagih',
                'status' => $officer->status,
                'username' => $officer->username,
            ],
        ]);
    }
}
