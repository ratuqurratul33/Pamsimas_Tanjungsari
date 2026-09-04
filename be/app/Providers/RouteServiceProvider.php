<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        // The dashboard fires several parallel requests per page (and again
        // on every realtime refresh), and public visitors on the same
        // network/IP all share one bucket — Laravel's 60/min default was
        // getting exhausted by completely normal usage and cascading into
        // failures across unrelated endpoints (including login, which sits
        // behind this same global limiter in addition to its own dedicated
        // throttle). Authenticated admin/petugas users get the higher
        // ceiling since they're a known identity generating legitimate
        // traffic; anonymous public-transparency visitors share an IP-keyed
        // bucket that's still generous but tighter, since that's the only
        // unauthenticated surface this limiter protects (login/OTP keep
        // their own dedicated throttle for brute-force protection).
        RateLimiter::for('api', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(500)->by($request->user()->id)
                : Limit::perMinute(120)->by($request->ip());
        });

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
}
