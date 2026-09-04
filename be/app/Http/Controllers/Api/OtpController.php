<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpCodeMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class OtpController extends Controller
{
    public function requestCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $throttleKey = 'otp-request:'.Str::lower($validated['email']).'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 3)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return response()->json([
                'message' => "Terlalu banyak permintaan. Coba lagi dalam {$seconds} detik.",
            ], 429);
        }

        RateLimiter::hit($throttleKey, 600);

        $user = User::query()->where('email', $validated['email'])->where('status', 'aktif')->first();

        if ($user) {
            $code = (string) random_int(100000, 999999);

            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            DB::table('password_reset_tokens')->insert([
                'email' => $user->email,
                'token' => Hash::make($code),
                'created_at' => now(),
            ]);

            Mail::to($user->email)->send(new OtpCodeMail($code, $user->name));
        }

        return response()->json([
            'message' => 'Jika email terdaftar, kode OTP telah dikirim.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'digits:6'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $attemptKey = 'otp-attempt:'.Str::lower($validated['email']);

        if (RateLimiter::tooManyAttempts($attemptKey, 5)) {
            $seconds = RateLimiter::availableIn($attemptKey);

            return response()->json([
                'message' => "Terlalu banyak percobaan kode salah. Coba lagi dalam {$seconds} detik.",
            ], 429);
        }

        $row = DB::table('password_reset_tokens')->where('email', $validated['email'])->first();
        $isExpired = ! $row || abs(now()->diffInMinutes($row->created_at)) > 10;

        if (! $row || $isExpired || ! Hash::check($validated['code'], $row->token)) {
            RateLimiter::hit($attemptKey, 900);

            return response()->json([
                'message' => $isExpired ? 'Kode OTP sudah kedaluwarsa, minta kode baru.' : 'Kode OTP tidak sesuai.',
            ], 422);
        }

        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user) {
            return response()->json(['message' => 'Akun tidak ditemukan.'], 422);
        }

        $user->update(['password' => Hash::make($validated['password'])]);
        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();
        RateLimiter::clear($attemptKey);

        return response()->json(['message' => 'Password berhasil diperbarui. Silakan login dengan password baru.']);
    }
}
