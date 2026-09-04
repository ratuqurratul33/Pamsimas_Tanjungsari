<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfficerDeposit extends Model
{
    protected $fillable = [
        'cash_total',
        'cash_counted',
        'deposit_number',
        'handed_over_note',
        'officer_id',
        'period_month',
        'period_year',
        'proof_path',
        'qris_total',
        'qris_confirmed',
        'received_amount',
        'received_at',
        'discrepancy_amount',
        'rejection_reason',
        'status',
        'submitted_at',
        'total_amount',
        'verified_at',
        'verified_by',
        'verification_note',
    ];

    protected $casts = [
        'cash_counted' => 'decimal:2',
        'discrepancy_amount' => 'decimal:2',
        'qris_confirmed' => 'decimal:2',
        'received_amount' => 'decimal:2',
        'received_at' => 'datetime',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
