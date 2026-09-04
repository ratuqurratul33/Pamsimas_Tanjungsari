<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganizationProfile extends Model
{
    protected $fillable = [
        'address',
        'contact',
        'contact_whatsapp',
        'description',
        'email',
        'established',
        'footer_contact_label',
        'mission',
        'name',
        'office_hours_days',
        'office_hours_time',
        'service_cards',
        'title',
        'vision',
    ];

    protected $casts = [
        'service_cards' => 'array',
    ];

    public function members(): HasMany
    {
        return $this->hasMany(OrganizationMember::class);
    }
}
