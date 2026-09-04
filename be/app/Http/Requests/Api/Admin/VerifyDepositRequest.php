<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;

class VerifyDepositRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'cash_counted' => ['nullable', 'integer', 'min:0'],
            'decision' => ['required', 'in:verified,rejected'],
            'note' => ['nullable', 'string', 'max:2000'],
            'physical_total' => ['required', 'integer', 'min:0'],
            'qris_confirmed' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
