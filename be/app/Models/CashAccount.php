<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashAccount extends Model
{
    protected $fillable = [
        'code',
        'currency',
        'current_balance',
        'name',
        'opening_balance',
        'opening_balance_locked_at',
        'opening_balance_locked_by',
        'opening_balance_period',
        'type',
    ];

    protected $casts = [
        'current_balance' => 'decimal:2',
        'opening_balance' => 'decimal:2',
        'opening_balance_locked_at' => 'datetime',
        'opening_balance_period' => 'date',
    ];

    public function transactions(): HasMany
    {
        return $this->hasMany(CashTransaction::class);
    }
}
