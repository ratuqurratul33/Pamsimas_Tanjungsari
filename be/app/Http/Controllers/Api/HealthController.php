<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::connection()->getPdo();

            return response()->json([
                'database' => 'ok',
                'service' => 'pamsimas-laravel-api',
                'status' => 'ok',
                'time' => now()->toIso8601String(),
            ]);
        } catch (Throwable) {
            return response()->json([
                'database' => 'unavailable',
                'service' => 'pamsimas-laravel-api',
                'status' => 'degraded',
                'time' => now()->toIso8601String(),
            ], 503);
        }
    }
}
