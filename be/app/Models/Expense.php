<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Expense extends Model
{
    protected $fillable = [
        'amount',
        'cash_account_id',
        'cash_transaction_id',
        'category',
        'created_by',
        'description',
        'expense_date',
        'is_public',
        'payment_method',
        'posted_at',
        'posted_by',
        'posting_note',
        'proof_path',
        'quantity',
        'reference_number',
        'status',
        'unit',
        'unit_price',
        'vendor',
        'voided_at',
        'voided_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
        'is_public' => 'boolean',
        'posted_at' => 'datetime',
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'voided_at' => 'datetime',
    ];

    public function cashAccount(): BelongsTo
    {
        return $this->belongsTo(CashAccount::class);
    }

    public function cashTransaction(): BelongsTo
    {
        return $this->belongsTo(CashTransaction::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
