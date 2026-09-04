<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Auth\LoginRequest;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validated();
        $identifier = $validated['login'] ?? $validated['email'];
        $user = User::query()
            ->where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if (! $user || $user->status !== 'aktif' || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Username/email atau password tidak sesuai.'], 422);
        }

        $token = $user->createToken('pamsimas-api-token', [$user->role])->plainTextToken;
        $auditLogger->write($user, 'auth.login', 'Pengguna berhasil login ke aplikasi.');

        return response()->json([
            'token' => $token,
            'user' => $user->only(['id', 'name', 'username', 'email', 'phone', 'role', 'status']),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        app(AuditLogger::class)->write($request->user(), 'auth.logout', 'Pengguna keluar dari aplikasi.');
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Berhasil logout.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()?->only(['id', 'name', 'username', 'email', 'phone', 'role', 'status']),
        ]);
    }
}
