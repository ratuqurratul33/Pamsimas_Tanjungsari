<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationMember extends Model
{
    protected $fillable = ['description', 'name', 'organization_profile_id', 'photo_path', 'position', 'sort_order'];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(OrganizationProfile::class, 'organization_profile_id');
    }
}
