<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tariff extends Model
{
    protected $fillable = [
        'admin_fee',
        'created_by',
        'effective_from',
        'effective_until',
        'is_active',
        'water_rate_per_m3',
    ];

    protected $casts = [
        'admin_fee' => 'decimal:2',
        'effective_from' => 'date',
        'effective_until' => 'date',
        'is_active' => 'boolean',
        'water_rate_per_m3' => 'decimal:2',
    ];

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
