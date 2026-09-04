<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bill extends Model
{
    protected $fillable = [
        'admin_fee',
        'customer_id',
        'due_date',
        'invoice_number',
        'meter_reading_id',
        'payment_status',
        'period_month',
        'period_year',
        'print_status',
        'tariff_id',
        'total_amount',
        'usage',
        'water_rate',
    ];

    protected $casts = ['due_date' => 'date'];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function meterReading(): BelongsTo
    {
        return $this->belongsTo(MeterReading::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(Receipt::class);
    }

    public function tariff(): BelongsTo
    {
        return $this->belongsTo(Tariff::class);
    }

    /**
     * The due date is snapshotted on the bill at creation time using the
     * billing_period.due_day setting active that month. Older bills created
     * before this column existed fall back to re-deriving it from the
     * setting so they still get a sensible due date.
     */
    public function dueDateFor(): Carbon
    {
        if ($this->due_date) {
            return Carbon::parse($this->due_date);
        }

        $billingSettings = Setting::where('key', 'billing_period')->value('value') ?? [];
        $dueDay = (int) ($billingSettings['due_day'] ?? 25);
        $daysInMonth = Carbon::create($this->period_year, $this->period_month, 1)->daysInMonth;

        return Carbon::create($this->period_year, $this->period_month, min(max($dueDay, 1), $daysInMonth));
    }

    /**
     * Returns the automatic late fee once payment passes the due date
     * (Pengaturan Sistem > Tanggal Jatuh Tempo), while keeping paid bills
     * unchanged. This must stay in sync with the due date printed on the
     * kwitansi in ReceiptBulkPage.
     */
    public function lateFeeAmount(?Carbon $asOf = null): float
    {
        if ($this->payment_status === 'lunas') {
            return 0.0;
        }

        if (($asOf ?? now())->lte($this->dueDateFor()->copy()->endOfDay())) {
            return 0.0;
        }

        $lateFee = Setting::where('key', 'late_fee')->value('value');

        return max((float) ($lateFee ?? 2000), 0.0);
    }

    public function amountDue(?Carbon $asOf = null): float
    {
        return (float) $this->total_amount + $this->lateFeeAmount($asOf);
    }
}
