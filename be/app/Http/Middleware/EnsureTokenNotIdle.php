<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sanctum tokens never expire on their own (config/sanctum.php's
 * `expiration` is null) so the 60-minute session limit is otherwise only
 * enforced client-side (see authService.ts), which a user can bypass by
 * editing localStorage. This mirrors that same rule server-side: an idle
 * gap of 60+ minutes since the token's last authenticated request revokes
 * it, but activity keeps sliding the window forward indefinitely — the
 * same "60 minutes idle, never while in active use" behavior already
 * confirmed as correct for the frontend timer.
 *
 * Registered ahead of `auth:sanctum` in the 'api' middleware group
 * (Kernel.php) so it inspects `last_used_at` before Sanctum's own guard
 * overwrites it with the current request's timestamp.
 */
class EnsureTokenNotIdle
{
    private const IDLE_LIMIT_MINUTES = 60;

    public function handle(Request $request, Closure $next): Response
    {
        $plainTextToken = $request->bearerToken();

        if ($plainTextToken) {
            $accessToken = PersonalAccessToken::findToken($plainTextToken);

            if ($accessToken?->last_used_at && $accessToken->last_used_at->diffInMinutes(now()) > self::IDLE_LIMIT_MINUTES) {
                $accessToken->delete();

                return response()->json([
                    'message' => 'Sesi telah berakhir karena tidak ada aktivitas selama 60 menit. Silakan login kembali.',
                ], 401);
            }
        }

        return $next($request);
    }
}
