<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PublicMapSetting extends Model
{
    protected $fillable = [
        'contact_label',
        'contact_whatsapp',
        'coverage',
        'description',
        'guide_description',
        'guide_steps',
        'guide_title',
        'map_image_path',
        'map_note',
        'status',
        'title',
    ];

    protected $casts = ['guide_steps' => 'array'];
}
