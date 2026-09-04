<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'amount' => (int) round((float) $this->amount),
            'cash_account_id' => $this->cash_account_id,
            'cash_transaction_id' => $this->cash_transaction_id,
            'category' => $this->category,
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->only(['id', 'name'])),
            'description' => $this->description,
            'expense_date' => $this->expense_date?->toDateString(),
            'id' => $this->id,
            'is_public' => (bool) $this->is_public,
            'payment_method' => $this->payment_method,
            'posted_at' => $this->posted_at?->toIso8601String(),
            'proof_preview' => $this->proof_path ? asset('storage/'.$this->proof_path) : null,
            'reference_number' => $this->reference_number,
            'status' => $this->status,
            'vendor' => $this->vendor,
        ];
    }
}
