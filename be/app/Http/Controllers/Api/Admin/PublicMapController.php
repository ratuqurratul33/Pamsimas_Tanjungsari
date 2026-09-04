<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PublicMapSetting;
use App\Support\RealtimeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PublicMapController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->transform($this->currentMap())]);
    }

    public function update(Request $request): JsonResponse
    {
        $map = $this->currentMap();
        $validated = $request->validate([
            'contact_label' => ['nullable', 'string', 'max:180'],
            'contact_whatsapp' => ['nullable', 'string', 'max:80'],
            'coverage' => ['nullable', 'string', 'max:180'],
            'description' => ['nullable', 'string'],
            'guide_description' => ['nullable', 'string'],
            'guide_steps' => ['nullable', 'array'],
            'guide_steps.*' => ['nullable', 'string'],
            'guide_title' => ['nullable', 'string', 'max:180'],
            'map_image' => ['nullable', 'image', 'max:12288'],
            'map_note' => ['nullable', 'string'],
            'status' => ['required', 'in:normal,perhatian'],
            'title' => ['required', 'string', 'max:180'],
        ]);

        if ($request->hasFile('map_image')) {
            if ($map->map_image_path && Storage::disk('public')->exists($map->map_image_path)) {
                Storage::disk('public')->delete($map->map_image_path);
            }

            $validated['map_image_path'] = $request->file('map_image')->store('public-maps', 'public');
        }

        $map->update($validated);

        RealtimeNotifier::updated(['public-content'], 'admin.public_map.updated');

        return response()->json(['data' => $this->transform($map->fresh())]);
    }

    private function currentMap(): PublicMapSetting
    {
        return PublicMapSetting::firstOrCreate([], [
            'status' => 'normal',
            'title' => 'Peta Jaringan Air',
        ]);
    }

    private function transform(PublicMapSetting $map): array
    {
        return [
            'contact_label' => $map->contact_label,
            'contact_whatsapp' => $map->contact_whatsapp,
            'coverage' => $map->coverage,
            'description' => $map->description,
            'guide_description' => $map->guide_description,
            'guide_steps' => $map->guide_steps ?? [],
            'guide_title' => $map->guide_title,
            'map_image_path' => $map->map_image_path,
            'map_image_url' => $map->map_image_path ? asset('storage/'.$map->map_image_path) : null,
            'map_note' => $map->map_note,
            'status' => $map->status,
            'title' => $map->title,
        ];
    }
}
