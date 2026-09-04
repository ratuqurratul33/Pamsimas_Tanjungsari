<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Region extends Model
{
    protected $fillable = ['code', 'household_count', 'kampung', 'name', 'parent_id', 'type'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Region::class, 'parent_id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'rt_id');
    }

    public function officers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'officer_assignments', 'region_id', 'officer_id')->withTimestamps();
    }
}
