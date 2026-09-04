<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreCashIncomeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'account_id' => ['required', 'integer', 'exists:cash_accounts,id'],
            'amount' => ['required', 'integer', 'min:1'],
            'description' => ['required', 'string', 'max:2000'],
            'is_opening_balance' => ['sometimes', 'boolean'],
            'occurred_at' => ['required', 'date'],
        ];
    }
}
