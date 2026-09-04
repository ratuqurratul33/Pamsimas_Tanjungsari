<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;

class AuditLogger
{
    public function write(?User $actor, string $action, string $description): void
    {
        ActivityLog::create([
            'action' => $action,
            'actor_name' => $actor?->name ?? 'System',
            'description' => $description,
            'ip_address' => request()?->ip(),
            'logged_at' => now(),
            'user_id' => $actor?->id,
        ]);
    }
}
