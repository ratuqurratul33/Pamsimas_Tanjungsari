<?php

namespace App\Http\Requests\Api\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return [
            'amount' => ['sometimes', 'integer', 'min:1'],
            'category' => ['sometimes', 'string', 'max:120'],
            'description' => ['sometimes', 'string'],
            'expense_date' => ['sometimes', 'date'],
            'is_public' => ['sometimes', 'boolean'],
            'proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png', 'max:2048'],
            'reference_number' => ['nullable', 'string', 'max:120'],
            'vendor' => ['nullable', 'string', 'max:160'],
        ];
    }
}
