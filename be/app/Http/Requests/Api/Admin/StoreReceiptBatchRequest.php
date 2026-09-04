<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreReceiptBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'include_empty_slots' => ['sometimes', 'accepted'],
            'officer_id' => ['required', 'integer', 'exists:users,id'],
            'period' => ['required', 'date_format:Y-m'],
            'receipt_ids' => ['required', 'array', 'min:1'],
            'receipt_ids.*' => ['integer', 'distinct', 'exists:receipts,id'],
            'template' => ['nullable', 'in:pamsimas-a4-3-up'],
        ];
    }
}
