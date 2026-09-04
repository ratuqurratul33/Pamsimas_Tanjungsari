<?php

namespace App\Support;

use App\Events\AppDataUpdated;
use Throwable;

class RealtimeNotifier
{
    /**
     * @param  array<int, string>  $scopes
     */
    public static function updated(array $scopes, string $source): void
    {
        try {
            broadcast(new AppDataUpdated($scopes, $source));
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
