<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Receipt extends Model
{
    protected $fillable = [
        'bill_id',
        'customer_address_snapshot',
        'customer_id',
        'customer_name_snapshot',
        'officer_id',
        'period_month',
        'period_year',
        'printed_at',
        'printed_by',
        'receipt_batch_id',
        'receipt_number',
        'status',
        'template_snapshot',
    ];

    protected $casts = [
        'printed_at' => 'datetime',
        'template_snapshot' => 'array',
    ];

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ReceiptBatch::class, 'receipt_batch_id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }

    public function printer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'printed_by');
    }
}
