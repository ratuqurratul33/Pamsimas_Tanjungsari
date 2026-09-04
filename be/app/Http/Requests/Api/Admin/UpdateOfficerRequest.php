<?php

namespace App\Http\Requests\Api\Admin;

use App\Models\Region;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateOfficerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $officerId = $this->route('officer')?->id;

        return [
            'gender' => ['nullable', 'in:laki-laki,perempuan'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:30', Rule::unique('users', 'phone')->ignore($officerId)],
            'photo' => ['nullable', 'image', 'max:4096'],
            'region_ids' => ['sometimes', 'required', 'array', 'min:1'],
            'region_ids.*' => ['integer', 'exists:regions,id'],
            'status' => ['sometimes', 'required', 'in:aktif,nonaktif'],
            'username' => ['sometimes', 'required', 'string', 'max:80', 'alpha_dash', Rule::unique('users', 'username')->ignore($officerId)],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                $officerId = $this->route('officer')?->id;
                $regionIds = $this->input('region_ids', []);

                if ($regionIds === []) {
                    return;
                }

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
                    ->whereKeyNot($officerId)
                    ->whereHas('assignedRegions', fn ($query) => $query->whereIn('regions.id', $regionIds))
                    ->exists();

                if ($takenRegions) {
                    $validator->errors()->add('region_ids', 'Salah satu wilayah sudah ditugaskan ke petugas aktif lain.');
                }
            },
        ];
    }
}
