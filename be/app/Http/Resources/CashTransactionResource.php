<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class CashTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'account_id' => $this->cash_account_id,
            'amount' => (int) round((float) $this->amount),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator?->only(['id', 'name'])),
            'description' => $this->description,
            'id' => $this->id,
            'occurred_at' => $this->transaction_at?->toIso8601String(),
            'source_id' => $this->reference_id,
            'source_type' => $this->reference_type
                ? match (class_basename($this->reference_type)) {
                    'CashTransfer' => 'transfer',
                    default => Str::snake(class_basename($this->reference_type)),
                }
                : 'manual_adjustment',
            'status' => $this->status,
            'type' => match ($this->type) {
                'transfer_in', 'transfer_out' => 'transfer',
                default => $this->type,
            },
        ];
    }
}
