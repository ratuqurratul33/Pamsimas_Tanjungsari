<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DocumentTemplate;
use App\Models\Faq;
use App\Models\Setting;
use App\Models\Tariff;
use App\Services\AuditLogger;
use App\Support\RealtimeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'faqs' => Faq::orderBy('sort_order')->get(),
                'active_tariff' => Tariff::query()->where('is_active', true)->latest('effective_from')->first(),
                'settings' => Setting::all()->pluck('value', 'key'),
                'templates' => DocumentTemplate::latest()->get(),
            ],
        ]);
    }

    public function update(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.base_tariff' => ['required', 'array'],
            'settings.base_tariff.admin_fee' => ['required', 'numeric', 'min:0'],
            'settings.base_tariff.water_rate_per_m3' => ['required', 'numeric', 'min:0'],
            'settings.billing_period' => ['required', 'array'],
            'settings.billing_period.due_day' => ['required', 'integer', 'between:1,31'],
            'settings.billing_period.month' => ['required', 'integer', 'between:1,12'],
            'settings.billing_period.year' => ['required', 'integer', 'between:2020,2100'],
            'settings.late_fee' => ['required', 'numeric', 'min:0'],
            'settings.receipt_signatory' => ['required', 'array'],
            'settings.receipt_signatory.name' => ['required', 'string', 'max:120'],
            'settings.receipt_signatory.title' => ['required', 'string', 'max:120'],
        ]);

        DB::transaction(function () use ($request, $validated) {
            foreach ($validated['settings'] as $key => $value) {
                Setting::updateOrCreate(['key' => $key], ['value' => $value]);
            }

            $tariffInput = $validated['settings']['base_tariff'];
            $activeTariff = Tariff::query()->where('is_active', true)->latest('effective_from')->first();
            $tariffChanged = ! $activeTariff
                || (float) $activeTariff->admin_fee !== (float) $tariffInput['admin_fee']
                || (float) $activeTariff->water_rate_per_m3 !== (float) $tariffInput['water_rate_per_m3'];

            if ($tariffChanged) {
                Tariff::query()->where('is_active', true)->update([
                    'effective_until' => now()->subDay()->toDateString(),
                    'is_active' => false,
                ]);
                Tariff::create([
                    'admin_fee' => $tariffInput['admin_fee'],
                    'created_by' => $request->user()->id,
                    'effective_from' => now()->toDateString(),
                    'is_active' => true,
                    'water_rate_per_m3' => $tariffInput['water_rate_per_m3'],
                ]);
            }
        });

        $auditLogger->write($request->user(), 'settings.updated', 'Pengaturan periode, tarif, dan biaya diperbarui.');
        RealtimeNotifier::updated(['settings', 'dashboard', 'receipts', 'field'], 'admin.settings.updated');

        return $this->index();
    }

    public function storeFaq(Request $request): JsonResponse
    {
        $faq = Faq::create($request->validate([
            'answer' => ['required', 'string'],
            'category' => ['nullable', 'string', 'max:100'],
            'question' => ['required', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]));
        RealtimeNotifier::updated(['public-content'], 'admin.public_faq.created');

        return response()->json($faq, 201);
    }

    public function replaceFaqs(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'faqs' => ['present', 'array', 'max:30'],
            'faqs.*.answer' => ['required', 'string'],
            'faqs.*.category' => ['nullable', 'string', 'max:100'],
            'faqs.*.id' => ['nullable', 'integer', 'exists:faqs,id'],
            'faqs.*.question' => ['required', 'string', 'max:255'],
        ]);

        $faqs = DB::transaction(function () use ($validated) {
            $keptIds = [];

            foreach ($validated['faqs'] as $index => $input) {
                $faq = isset($input['id']) ? Faq::findOrFail($input['id']) : new Faq;
                $faq->fill([
                    'answer' => $input['answer'],
                    'category' => $input['category'] ?? 'Umum',
                    'is_active' => true,
                    'question' => $input['question'],
                    'sort_order' => $index + 1,
                ])->save();
                $keptIds[] = $faq->id;
            }

            Faq::query()->whereNotIn('id', $keptIds)->delete();

            return Faq::query()->where('is_active', true)->orderBy('sort_order')->get();
        });

        $auditLogger->write($request->user(), 'public.faqs.updated', 'Daftar FAQ publik diperbarui.');
        RealtimeNotifier::updated(['public-content'], 'admin.public_faqs.updated');

        return response()->json(['data' => $faqs]);
    }
}
