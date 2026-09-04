<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReceiptBatch extends Model
{
    protected $fillable = [
        'batch_number', 'period_month', 'period_year', 'officer_id', 'receipt_count',
        'page_count', 'slots_per_page', 'empty_slots', 'status', 'file_path',
        'printed_at', 'printed_by',
    ];

    protected $casts = [
        'printed_at' => 'datetime',
    ];

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }

    public function printer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'printed_by');
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(Receipt::class);
    }
}
