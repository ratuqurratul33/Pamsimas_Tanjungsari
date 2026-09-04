<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IdempotencyRequest extends Model
{
    protected $fillable = [
        'user_id', 'key', 'route', 'request_hash', 'response_status', 'response_body', 'completed_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
        'response_body' => 'array',
    ];
}
