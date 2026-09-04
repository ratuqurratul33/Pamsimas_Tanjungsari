<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $customerId = $this->route('customer')?->id;

        return [
            'address' => ['sometimes', 'required', 'string'],
            'customer_code' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('customers', 'customer_code')->ignore($customerId)],
            'dusun_id' => ['nullable', 'exists:regions,id'],
            'joined_at' => ['nullable', 'date'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'rt_id' => ['nullable', 'exists:regions,id'],
            'status' => ['sometimes', 'required', 'in:aktif,menunggak,nonaktif'],
        ];
    }
}
