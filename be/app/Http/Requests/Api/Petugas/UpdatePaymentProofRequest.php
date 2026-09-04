<?php

namespace App\Http\Requests\Api\Petugas;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentProofRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'method' => ['nullable', 'in:tunai,qris'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:2048'],
            'qris_proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:2048'],
        ];
    }
}
