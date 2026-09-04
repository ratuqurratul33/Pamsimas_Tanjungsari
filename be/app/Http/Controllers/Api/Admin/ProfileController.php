<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrganizationMember;
use App\Models\OrganizationProfile;
use App\Support\RealtimeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->transform($this->currentProfile()->load('members'))]);
    }

    public function update(Request $request): JsonResponse
    {
        $profile = $this->currentProfile();
        $request->merge([
            'members' => collect($request->input('members', []))
                ->filter(fn (array $member) => filled($member['name'] ?? null) || filled($member['position'] ?? null) || filled($member['description'] ?? null))
                ->values()
                ->all(),
        ]);

        $validated = $request->validate([
            'address' => ['nullable', 'string'],
            'contact_whatsapp' => ['nullable', 'string', 'max:80'],
            'description' => ['required', 'string'],
            'established' => ['nullable', 'string', 'max:120'],
            'footer_contact_label' => ['nullable', 'string', 'max:180'],
            'members' => ['nullable', 'array'],
            'members.*.description' => ['nullable', 'string'],
            'members.*.id' => ['nullable', 'integer', 'exists:organization_members,id'],
            'members.*.name' => ['required', 'string', 'max:150'],
            'members.*.photo' => ['nullable', 'image', 'max:2048'],
            'members.*.position' => ['required', 'string', 'max:150'],
            'members.*.sort_order' => ['nullable', 'integer'],
            'name' => ['required', 'string', 'max:150'],
            'office_hours_days' => ['nullable', 'string', 'max:120'],
            'office_hours_time' => ['nullable', 'string', 'max:120'],
            'service_cards' => ['nullable', 'array', 'size:3'],
            'service_cards.*.desc' => ['required', 'string'],
            'service_cards.*.icon' => ['required', 'string', 'max:80'],
            'service_cards.*.title' => ['required', 'string', 'max:180'],
            'title' => ['required', 'string', 'max:180'],
        ]);

        DB::transaction(function () use ($profile, $validated, $request) {
            $profile->update([
                'address' => $validated['address'] ?? null,
                'contact_whatsapp' => $validated['contact_whatsapp'] ?? null,
                'description' => $validated['description'],
                'established' => $validated['established'] ?? null,
                'footer_contact_label' => $validated['footer_contact_label'] ?? null,
                'name' => $validated['name'],
                'office_hours_days' => $validated['office_hours_days'] ?? null,
                'office_hours_time' => $validated['office_hours_time'] ?? null,
                'service_cards' => $validated['service_cards'] ?? [],
                'title' => $validated['title'],
            ]);

            $memberIds = [];
            foreach ($validated['members'] ?? [] as $index => $memberData) {
                $member = isset($memberData['id'])
                    ? $profile->members()->findOrFail($memberData['id'])
                    : new OrganizationMember(['organization_profile_id' => $profile->id]);
                $photo = $request->file("members.{$index}.photo");

                if ($photo) {
                    if ($member->photo_path) {
                        Storage::disk('public')->delete($member->photo_path);
                    }
                    $member->photo_path = $photo->store('organization-members', 'public');
                }

                $member->fill([
                    'description' => $memberData['description'] ?? null,
                    'name' => $memberData['name'],
                    'position' => $memberData['position'],
                    'sort_order' => $index + 1,
                ]);
                $member->organization_profile_id = $profile->id;
                $member->save();

                $memberIds[] = $member->id;
            }

            $removedMembers = $profile->members()->whereNotIn('id', $memberIds)->get();
            foreach ($removedMembers as $removedMember) {
                if ($removedMember->photo_path) {
                    Storage::disk('public')->delete($removedMember->photo_path);
                }
                $removedMember->delete();
            }
        });

        RealtimeNotifier::updated(['public-content', 'dashboard'], 'admin.profile.updated');

        return response()->json(['data' => $this->transform($profile->fresh('members'))]);
    }

    private function currentProfile(): OrganizationProfile
    {
        return OrganizationProfile::firstOrCreate([], [
            'description' => 'Informasi profil publik belum dilengkapi oleh admin.',
            'name' => 'PAMSIMAS Tanjungsari',
            'title' => 'Profil PAMSIMAS Tanjungsari',
        ]);
    }

    private function transform(OrganizationProfile $profile): array
    {
        return [
            'address' => $profile->address,
            'contact_whatsapp' => $profile->contact_whatsapp,
            'description' => $profile->description,
            'established' => $profile->established,
            'footer_contact_label' => $profile->footer_contact_label,
            'members' => $profile->members
                ->sortBy('sort_order')
                ->values()
                ->map(fn (OrganizationMember $member) => [
                    'description' => $member->description,
                    'id' => $member->id,
                    'name' => $member->name,
                    'photo_url' => $member->photo_path ? asset('storage/'.$member->photo_path) : null,
                    'position' => $member->position,
                ]),
            'name' => $profile->name,
            'office_hours_days' => $profile->office_hours_days,
            'office_hours_time' => $profile->office_hours_time,
            'service_cards' => $profile->service_cards ?? [],
            'title' => $profile->title,
        ];
    }
}
