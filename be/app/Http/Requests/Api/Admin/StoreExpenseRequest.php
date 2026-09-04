<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1'],
            'cash_account_id' => ['required', 'exists:cash_accounts,id'],
            'category' => ['required', 'string', 'max:120'],
            'description' => ['required', 'string'],
            'expense_date' => ['required', 'date'],
            'is_public' => ['boolean'],
            'payment_method' => ['required', 'in:cash,bank,qris'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:2048'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'unit' => ['nullable', 'string', 'max:30'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'reference_number' => ['nullable', 'string', 'max:120'],
            'vendor' => ['nullable', 'string', 'max:160'],
        ];
    }
}
