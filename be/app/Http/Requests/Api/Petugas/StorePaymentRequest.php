<?php

namespace App\Http\Requests\Api\Petugas;

use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'bill_id' => ['nullable', 'exists:bills,id', 'required_without:customer_id'],
            'customer_id' => ['nullable', 'exists:customers,id', 'required_without:bill_id'],
            'method' => ['required', 'in:tunai,qris'],
            'note' => ['nullable', 'string', 'max:1000'],
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:2048'],
            'qris_proof' => ['nullable', 'required_if:method,qris', 'file', 'mimes:jpg,jpeg,png', 'max:2048'],
        ];
    }
}
