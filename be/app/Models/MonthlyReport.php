<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MonthlyReport extends Model
{
    protected $fillable = [
        'ending_balance',
        'expense_total',
        'generated_at',
        'generated_by',
        'opening_balance',
        'period_end',
        'period_month',
        'period_start',
        'period_year',
        'scope',
        'snapshot',
        'transfer_total',
        'verified_income_total',
    ];

    protected $casts = [
        'ending_balance' => 'decimal:2',
        'expense_total' => 'decimal:2',
        'generated_at' => 'datetime',
        'opening_balance' => 'decimal:2',
        'period_end' => 'date',
        'period_start' => 'date',
        'snapshot' => 'array',
        'transfer_total' => 'decimal:2',
        'verified_income_total' => 'decimal:2',
    ];

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
