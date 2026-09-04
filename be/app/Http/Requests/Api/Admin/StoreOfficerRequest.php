<?php

namespace App\Http\Requests\Api\Admin;

use App\Models\Region;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreOfficerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'gender' => ['nullable', 'in:laki-laki,perempuan'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30', 'unique:users,phone'],
            'photo' => ['nullable', 'image', 'max:4096'],
            'region_ids' => ['required', 'array', 'min:1'],
            'region_ids.*' => ['integer', 'exists:regions,id'],
            'status' => ['required', 'in:aktif,nonaktif'],
            'username' => ['required', 'string', 'max:80', 'alpha_dash', 'unique:users,username'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $regionIds = $this->input('region_ids', []);
                $hasNonRtRegion = Region::query()
                    ->whereIn('id', $regionIds)
                    ->where('type', '!=', 'rt')
                    ->exists();

                if ($hasNonRtRegion) {
                    $validator->errors()->add('region_ids', 'Wilayah tugas petugas harus dipilih sampai level RT.');

                    return;
                }

                $takenRegions = User::query()
                    ->where('role', 'petugas')
                    ->where('status', 'aktif')
                    ->whereHas('assignedRegions', fn ($query) => $query->whereIn('regions.id', $regionIds))
                    ->with('assignedRegions:id,name,kampung')
                    ->get();

                if ($takenRegions->isNotEmpty()) {
                    $validator->errors()->add('region_ids', 'Salah satu wilayah sudah ditugaskan ke petugas aktif lain.');
                }
            },
        ];
    }
}
