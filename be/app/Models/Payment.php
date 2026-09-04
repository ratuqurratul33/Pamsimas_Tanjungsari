<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'amount',
        'bill_id',
        'method',
        'note',
        'officer_deposit_id',
        'officer_id',
        'paid_at',
        'proof_path',
        'qris_proof_path',
        'rejection_reason',
        'status',
        'verified_at',
        'verified_by',
    ];

    protected $casts = ['paid_at' => 'datetime', 'verified_at' => 'datetime'];

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }

    public function deposit(): BelongsTo
    {
        return $this->belongsTo(OfficerDeposit::class, 'officer_deposit_id');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
