<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepositResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'deposit_number' => $this->deposit_number,
            'digital_total' => (int) round((float) $this->total_amount),
            'discrepancy' => $this->received_amount === null ? null : (int) round((float) $this->discrepancy_amount),
            'id' => $this->id,
            'note' => $this->verification_note ?? $this->rejection_reason,
            'officer' => $this->whenLoaded('officer', fn () => [
                'code' => sprintf('PTG-%03d', $this->officer_id),
                'id' => $this->officer_id,
                'name' => $this->officer?->name,
            ]),
            'payment_summary' => [
                'cash' => (int) round((float) $this->cash_total),
                'count' => $this->relationLoaded('payments') ? $this->payments->where('status', '!=', 'rejected')->count() : ($this->payments_count ?? 0),
                'qris' => (int) round((float) $this->qris_total),
            ],
            'payments' => $this->when($this->relationLoaded('payments'), fn () => $this->payments->map(fn ($payment) => [
                'bill_amount' => (int) round((float) $payment->amount),
                'customer_area' => $payment->bill?->customer?->address,
                'customer_id' => $payment->bill?->customer?->customer_code,
                'customer_name' => $payment->bill?->customer?->name,
                'id' => (string) $payment->id,
                'method' => $payment->method === 'qris' ? 'QRIS' : 'Tunai',
                'payment_date' => $payment->paid_at?->toIso8601String(),
                'proof_preview' => $payment->proof_path ? asset('storage/'.$payment->proof_path) : null,
                'qris_proof_preview' => $payment->qris_proof_path ? asset('storage/'.$payment->qris_proof_path) : null,
                'receipt_number' => $payment->bill?->receipts?->last()?->receipt_number,
                'status' => $payment->status,
                'total_usage' => (int) ($payment->bill?->usage ?? 0),
            ])->values()),
            'period' => sprintf('%04d-%02d', $this->period_year, $this->period_month),
            'physical_total' => $this->received_amount === null ? null : (int) round((float) $this->received_amount),
            'received_at' => $this->received_at?->toIso8601String(),
            'status' => $this->status,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'verified_at' => $this->verified_at?->toIso8601String(),
        ];
    }
}
