<?php

namespace Tests\Feature;

use App\Mail\OtpCodeMail;
use Database\Seeders\PamsimasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OtpPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_otp_sends_mail_and_stores_hashed_code_for_existing_user(): void
    {
        $this->seed(PamsimasSeeder::class);
        Mail::fake();

        $this->postJson('/api/auth/otp/request', ['email' => 'admin@pamsimas.local'])
            ->assertOk();

        Mail::assertSent(OtpCodeMail::class, function (OtpCodeMail $mail) {
            return $mail->recipientName === 'Admin Utama' && preg_match('/^\d{6}$/', $mail->code) === 1;
        });

        $row = DB::table('password_reset_tokens')->where('email', 'admin@pamsimas.local')->first();
        $this->assertNotNull($row);
        $this->assertNotEmpty($row->token);
    }

    public function test_request_otp_does_not_leak_whether_email_exists(): void
    {
        $this->seed(PamsimasSeeder::class);
        Mail::fake();

        $this->postJson('/api/auth/otp/request', ['email' => 'tidak-ada@pamsimas.local'])
            ->assertOk();

        Mail::assertNothingSent();
        $this->assertNull(DB::table('password_reset_tokens')->where('email', 'tidak-ada@pamsimas.local')->first());
    }

    public function test_reset_password_with_correct_code_updates_password_and_clears_token(): void
    {
        $this->seed(PamsimasSeeder::class);

        DB::table('password_reset_tokens')->insert([
            'email' => 'admin@pamsimas.local',
            'token' => Hash::make('123456'),
            'created_at' => now(),
        ]);

        $this->postJson('/api/auth/otp/reset', [
            'code' => '123456',
            'email' => 'admin@pamsimas.local',
            'password' => 'password-baru-aman',
            'password_confirmation' => 'password-baru-aman',
        ])->assertOk();

        $this->assertNull(DB::table('password_reset_tokens')->where('email', 'admin@pamsimas.local')->first());

        $this->postJson('/api/auth/login', ['login' => 'admin', 'password' => 'password-baru-aman'])
            ->assertOk();
    }

    public function test_reset_password_with_wrong_code_is_rejected_and_old_password_still_works(): void
    {
        $this->seed(PamsimasSeeder::class);

        DB::table('password_reset_tokens')->insert([
            'email' => 'admin@pamsimas.local',
            'token' => Hash::make('123456'),
            'created_at' => now(),
        ]);

        $this->postJson('/api/auth/otp/reset', [
            'code' => '999999',
            'email' => 'admin@pamsimas.local',
            'password' => 'password-baru-aman',
            'password_confirmation' => 'password-baru-aman',
        ])->assertStatus(422);

        $this->postJson('/api/auth/login', ['login' => 'admin', 'password' => 'password'])
            ->assertOk();
    }

    public function test_reset_password_with_expired_code_is_rejected(): void
    {
        $this->seed(PamsimasSeeder::class);

        DB::table('password_reset_tokens')->insert([
            'email' => 'admin@pamsimas.local',
            'token' => Hash::make('123456'),
            'created_at' => now()->subMinutes(11),
        ]);

        $this->postJson('/api/auth/otp/reset', [
            'code' => '123456',
            'email' => 'admin@pamsimas.local',
            'password' => 'password-baru-aman',
            'password_confirmation' => 'password-baru-aman',
        ])->assertStatus(422);
    }

    public function test_reset_password_requires_matching_confirmation(): void
    {
        $this->seed(PamsimasSeeder::class);

        DB::table('password_reset_tokens')->insert([
            'email' => 'admin@pamsimas.local',
            'token' => Hash::make('123456'),
            'created_at' => now(),
        ]);

        $this->postJson('/api/auth/otp/reset', [
            'code' => '123456',
            'email' => 'admin@pamsimas.local',
            'password' => 'password-baru-aman',
            'password_confirmation' => 'tidak-cocok',
        ])->assertStatus(422);
    }
}
