<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'admin_fee' => $this->bill ? (int) round((float) $this->bill->admin_fee) : null,
            'bill_amount' => $this->bill ? (int) round((float) $this->bill->total_amount) : null,
            'customer_address' => $this->customer_address_snapshot,
            'customer_code' => $this->customer?->customer_code,
            'customer_id' => $this->customer_id,
            'customer_name' => $this->customer_name_snapshot,
            'id' => $this->id,
            'meter_end' => $this->bill?->meterReading?->current_meter,
            'meter_reading_id' => $this->bill?->meterReading?->id,
            'meter_start' => $this->bill?->meterReading?->previous_meter,
            'meter_usage' => $this->bill?->usage,
            // Older queued receipts may not have officer_id populated. The
            // meter reading is the authoritative officer for this workflow.
            'officer_id' => $this->officer_id ?? $this->bill?->meterReading?->officer_id,
            'officer_name' => $this->officer?->name ?? $this->bill?->meterReading?->officer?->name,
            'period' => sprintf('%04d-%02d', $this->period_year, $this->period_month),
            'printed_at' => $this->printed_at?->toIso8601String(),
            'receipt_number' => $this->receipt_number,
            'status' => $this->status,
            'template_snapshot' => $this->template_snapshot,
            'water_rate' => $this->bill ? (int) round((float) $this->bill->water_rate) : null,
        ];
    }
}
