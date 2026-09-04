<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;

class CashTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'amount' => ['required', 'integer', 'min:1'],
            'description' => ['required', 'string', 'max:2000'],
            'from_account_id' => ['required', 'integer', 'different:to_account_id', 'exists:cash_accounts,id'],
            'occurred_at' => ['required', 'date'],
            'to_account_id' => ['required', 'integer', 'different:from_account_id', 'exists:cash_accounts,id'],
        ];
    }
}
