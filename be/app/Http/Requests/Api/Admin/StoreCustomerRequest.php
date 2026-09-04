<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'address' => ['required', 'string'],
            'dusun_id' => ['nullable', 'exists:regions,id'],
            'joined_at' => ['nullable', 'date'],
            'name' => ['required', 'string', 'max:255'],
            'rt_id' => ['nullable', 'exists:regions,id'],
            'status' => ['required', 'in:aktif,menunggak,nonaktif'],
        ];
    }
}
