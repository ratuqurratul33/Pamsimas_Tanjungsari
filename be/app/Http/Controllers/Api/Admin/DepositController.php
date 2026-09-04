<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\VerifyDepositRequest;
use App\Http\Resources\CashTransactionResource;
use App\Http\Resources\DepositResource;
use App\Models\Bill;
use App\Models\OfficerDeposit;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use App\Services\DepositService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepositController extends Controller
{
    public function __construct(private readonly DepositService $depositService) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'officer_id' => ['nullable', 'integer', 'exists:users,id'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'period' => ['nullable', 'date_format:Y-m'],
            'status' => ['nullable', 'in:draft,pending,verified,rejected'],
        ]);

        $deposits = OfficerDeposit::query()
            ->with(['officer', 'payments.bill.customer', 'payments.bill.receipts'])
            ->withCount('payments')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('officer_id'), fn ($query) => $query->where('officer_id', $request->integer('officer_id')))
            ->when($request->filled('period'), function ($query) use ($request) {
                [$year, $month] = array_map('intval', explode('-', $request->string('period')->toString()));
                $query->where('period_month', $month)->where('period_year', $year);
            })
            ->latest('submitted_at')
            ->paginate(min($request->integer('per_page', 25), 100));

        return DepositResource::collection($deposits)
            ->additional(['summary' => $this->buildSummary()])
            ->response();
    }

    public function stats(): JsonResponse
    {
        return response()->json(['data' => $this->buildSummary()]);
    }

    public function show(OfficerDeposit $deposit): JsonResponse
    {
        return response()->json([
            'data' => new DepositResource($deposit->load(['officer', 'payments.bill.customer', 'payments.bill.receipts'])),
        ]);
    }

    public function verify(VerifyDepositRequest $request, OfficerDeposit $deposit): JsonResponse
    {
        $result = $this->depositService->verify($deposit, $request->validated(), $request->user());
        $result['transactions']->each(fn ($transaction) => $transaction->load('creator'));

        return response()->json([
            'data' => [
                'cash_transactions' => CashTransactionResource::collection($result['transactions']),
                'deposit' => new DepositResource($result['deposit']),
            ],
            'message' => $result['deposit']->status === 'verified'
                ? 'Setoran terverifikasi dan sudah masuk kas resmi.'
                : 'Setoran ditolak dan tidak mengubah kas.',
        ]);
    }

    public function rejectPayment(Request $request, OfficerDeposit $deposit, Payment $payment): JsonResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'max:2000']]);
        $updated = $this->depositService->rejectPayment($deposit, $payment, $validated['reason'], $request->user());

        return response()->json([
            'data' => new DepositResource($updated),
            'message' => 'Pembayaran pelanggan ditolak dan total setoran dihitung ulang.',
        ]);
    }

    public function updatePaymentStatus(Request $request, OfficerDeposit $deposit, Payment $payment): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:2000'],
            'status' => ['required', 'in:pending,verified,rejected'],
        ]);
        $updated = $this->depositService->updatePaymentStatus(
            $deposit,
            $payment,
            $validated['status'],
            $request->user(),
            $validated['reason'] ?? null,
        );

        return response()->json([
            'data' => new DepositResource($updated),
            'message' => 'Status pembayaran pelanggan berhasil diperbarui.',
        ]);
    }

    private function buildSummary(): array
    {
        $period = Setting::query()->where('key', 'billing_period')->value('value') ?? [];
        $month = (int) ($period['month'] ?? now()->month);
        $year = (int) ($period['year'] ?? now()->year);
        $expected = (float) Bill::query()->where('period_month', $month)->where('period_year', $year)->sum('total_amount');
        $verifiedToday = OfficerDeposit::query()->where('status', 'verified')->whereDate('verified_at', today())->get();
        $verifiedAmount = (float) $verifiedToday->sum('received_amount');
        $discrepancy = (float) $verifiedToday->sum(fn ($deposit) => abs((float) $deposit->discrepancy_amount));
        $activeOfficers = User::query()->where('role', 'petugas')->where('status', 'aktif')->count();
        $submittedToday = OfficerDeposit::query()->whereDate('submitted_at', today())->distinct('officer_id')->count('officer_id');

        return [
            'collection_percentage' => $expected > 0 ? round(($verifiedAmount / $expected) * 100, 2) : 0,
            'discrepancy_amount' => (int) round($discrepancy),
            'discrepancy_status' => $discrepancy === 0.0 ? 'Aman' : 'Peringatan',
            'pending_deposit_amount' => (int) round((float) OfficerDeposit::query()->where('status', 'pending')->sum('total_amount')),
            'pending_officers_today' => max($activeOfficers - $submittedToday, 0),
            'period' => sprintf('%04d-%02d', $year, $month),
            'verified_deposit_amount' => (int) round($verifiedAmount),
            'verified_today_count' => $verifiedToday->count(),
        ];
    }
}
