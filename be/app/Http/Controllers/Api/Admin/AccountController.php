<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\UpdateAccountRequest;
use App\Support\RealtimeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AccountController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->transform($request->user())]);
    }

    public function update(UpdateAccountRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->safe()->except(['photo']);

        if ($request->hasFile('photo')) {
            if ($user->photo_path) {
                Storage::disk('public')->delete($user->photo_path);
            }

            $data['photo_path'] = $request->file('photo')->store('account-photos', 'public');
        }

        $user->update($data);

        RealtimeNotifier::updated(['account', 'dashboard'], 'admin.account.updated');

        return response()->json([
            'data' => $this->transform($user->fresh()),
            'message' => 'Akun admin berhasil diperbarui.',
        ]);
    }

    private function transform($user): array
    {
        return [
            'avatar' => $user->avatar,
            'email' => $user->email,
            'gender' => $user->gender,
            'id' => $user->id,
            'name' => $user->name,
            'photo_url' => $user->photo_path ? asset('storage/'.$user->photo_path) : null,
            'role' => $user->role,
            'username' => $user->username,
        ];
    }
}
