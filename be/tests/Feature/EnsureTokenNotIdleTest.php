<?php

namespace Tests\Feature;

use Database\Seeders\PamsimasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class EnsureTokenNotIdleTest extends TestCase
{
    use RefreshDatabase;

    private function login(): string
    {
        $this->seed(PamsimasSeeder::class);

        return $this->postJson('/api/auth/login', ['login' => 'admin', 'password' => 'password'])
            ->assertOk()
            ->json('token');
    }

    public function test_a_token_idle_for_over_60_minutes_is_rejected_and_revoked(): void
    {
        $token = $this->login();
        $accessToken = PersonalAccessToken::findToken($token);
        $accessToken->forceFill(['last_used_at' => now()->subMinutes(61)])->save();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->getJson('/api/auth/me')
            ->assertStatus(401);

        $this->assertNull(PersonalAccessToken::findToken($token));
    }

    public function test_a_token_used_within_the_last_60_minutes_still_works(): void
    {
        $token = $this->login();
        $accessToken = PersonalAccessToken::findToken($token);
        $accessToken->forceFill(['last_used_at' => now()->subMinutes(59)])->save();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->getJson('/api/auth/me')
            ->assertOk();
    }

    public function test_a_freshly_issued_never_used_token_is_not_treated_as_idle(): void
    {
        $token = $this->login();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->getJson('/api/auth/me')
            ->assertOk();
    }
}
