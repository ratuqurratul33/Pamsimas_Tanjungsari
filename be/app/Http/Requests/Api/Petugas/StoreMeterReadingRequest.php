<?php

namespace App\Http\Requests\Api\Petugas;

use Illuminate\Foundation\Http\FormRequest;

class StoreMeterReadingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'exists:customers,id'],
            'current_meter' => ['required', 'integer', 'min:0'],
            'period_month' => ['required', 'integer', 'between:1,12'],
            'period_year' => ['required', 'integer', 'min:2020'],
            'previous_meter' => ['nullable', 'integer', 'min:0'],
            'recorded_at' => ['nullable', 'date'],
        ];
    }
}
