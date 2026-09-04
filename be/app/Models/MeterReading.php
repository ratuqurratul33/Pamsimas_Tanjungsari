<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class MeterReading extends Model
{
    protected $fillable = [
        'current_meter',
        'customer_id',
        'officer_id',
        'period_month',
        'period_year',
        'previous_meter',
        'recorded_at',
        'usage',
    ];

    protected $casts = ['recorded_at' => 'date'];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }

    public function bill(): HasOne
    {
        return $this->hasOne(Bill::class);
    }
}
