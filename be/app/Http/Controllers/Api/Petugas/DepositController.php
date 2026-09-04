<?php

namespace App\Http\Controllers\Api\Petugas;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Resources\DepositResource;
use App\Models\OfficerDeposit;
use App\Models\Payment;
use App\Services\AuditLogger;
use App\Support\RealtimeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DepositController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'status' => ['nullable', 'in:draft,pending,verified,rejected'],
        ]);
        $deposits = OfficerDeposit::query()
            ->where('officer_id', $request->user()->id)
            ->with(['officer', 'payments.bill.customer', 'payments.bill.receipts'])
            ->withCount('payments')
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest('submitted_at')
            ->paginate(min((int) ($validated['per_page'] ?? 25), 100));

        return DepositResource::collection($deposits)->response();
    }

    public function store(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'handed_over_note' => ['nullable', 'string', 'max:2000'],
            'payment_ids' => ['nullable', 'array', 'min:1'],
            'payment_ids.*' => ['integer', 'distinct', 'exists:payments,id'],
            'period' => ['nullable', 'date_format:Y-m', 'required_without_all:period_month,period_year'],
            'period_month' => ['nullable', 'integer', 'between:1,12', 'required_without:period'],
            'period_year' => ['nullable', 'integer', 'min:2020', 'required_without:period'],
        ]);
        [$year, $month] = isset($validated['period'])
            ? array_map('intval', explode('-', $validated['period']))
            : [(int) $validated['period_year'], (int) $validated['period_month']];
        $deposit = DB::transaction(function () use ($validated, $month, $year, $request) {
            $query = Payment::query()
                ->where('officer_id', $request->user()->id)
                ->whereNull('officer_deposit_id')
                ->where('status', 'pending')
                ->whereHas('bill', fn ($billQuery) => $billQuery->where('period_month', $month)->where('period_year', $year))
                ->with('bill');

            if (! empty($validated['payment_ids'])) {
                $query->whereIn('id', $validated['payment_ids']);
            }

            $payments = $query->lockForUpdate()->get();

            if ($payments->isEmpty()) {
                throw new BusinessRuleException('Belum ada pembayaran pelanggan yang siap disetorkan.');
            }

            foreach ($payments as $payment) {
                $payment->update(['amount' => $payment->bill?->amountDue() ?? $payment->amount]);
            }

            $payments = Payment::query()->whereIn('id', $payments->pluck('id'))->get();
            $cashTotal = (float) $payments->where('method', 'tunai')->sum('amount');
            $qrisTotal = (float) $payments->where('method', 'qris')->sum('amount');
            $deposit = OfficerDeposit::create([
                'cash_total' => $cashTotal,
                'deposit_number' => sprintf('SET-%04d-%02d-%s', $year, $month, Str::upper(Str::random(6))),
                'handed_over_note' => $validated['handed_over_note'] ?? null,
                'officer_id' => $request->user()->id,
                'period_month' => $month,
                'period_year' => $year,
                'qris_total' => $qrisTotal,
                'received_at' => now(),
                'status' => 'pending',
                'submitted_at' => now(),
                'total_amount' => $cashTotal + $qrisTotal,
            ]);
            Payment::query()->whereIn('id', $payments->pluck('id'))->update(['officer_deposit_id' => $deposit->id]);

            return $deposit;
        });

        $auditLogger->write($request->user(), 'deposit.submitted', "Setoran {$deposit->deposit_number} diserahkan ke admin.");
        RealtimeNotifier::updated(['field', 'deposits', 'dashboard'], 'petugas.deposit.submitted');

        return response()->json([
            'data' => new DepositResource($deposit->load(['officer', 'payments.bill.customer', 'payments.bill.receipts'])),
            'message' => 'Setoran sudah diajukan dan menunggu verifikasi admin.',
        ], 201);
    }
}
