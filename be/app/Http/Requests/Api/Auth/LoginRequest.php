<?php

namespace App\Http\Requests\Api\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['nullable', 'email', 'required_without:login'],
            'login' => ['nullable', 'string', 'max:120', 'required_without:email'],
            'password' => ['required', 'string'],
        ];
    }
}
