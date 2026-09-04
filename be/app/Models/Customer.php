<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'address',
        'customer_code',
        'dusun_id',
        'joined_at',
        'name',
        'rt_id',
        'status',
    ];

    protected $casts = ['joined_at' => 'date'];

    public function getRouteKeyName(): string
    {
        return 'customer_code';
    }

    public static function nextCustomerCode(): string
    {
        $lastNumber = static::query()
            ->withTrashed()
            ->where('customer_code', 'like', 'PAM%')
            ->pluck('customer_code')
            ->reduce(function (int $max, string $code) {
                if (preg_match('/^PAM[- ](\d+)$/', $code, $matches) === 1) {
                    return max($max, (int) $matches[1]);
                }

                return $max;
            }, 0);

        return sprintf('PAM-%03d', $lastNumber + 1);
    }

    public function dusun(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'dusun_id');
    }

    public function rt(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'rt_id');
    }

    public function meterReadings(): HasMany
    {
        return $this->hasMany(MeterReading::class);
    }

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }
}
