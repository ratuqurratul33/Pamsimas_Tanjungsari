<?php

namespace App\Http\Controllers\Api\Petugas;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Petugas\StorePaymentRequest;
use App\Http\Requests\Api\Petugas\UpdatePaymentProofRequest;
use App\Models\Bill;
use App\Models\Payment;
use App\Support\FieldCustomerPresenter;
use App\Support\RealtimeNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PaymentController extends Controller
{
    public function store(StorePaymentRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $bill = isset($validated['bill_id'])
            ? Bill::findOrFail($validated['bill_id'])
            : Bill::query()
                ->where('customer_id', $validated['customer_id'])
                ->whereIn('payment_status', ['sudah_input_meter', 'belum_lunas', 'ditolak'])
                ->latest('period_year')
                ->latest('period_month')
                ->firstOrFail();
        abort_unless($request->user()->canAccessCustomer($bill->customer), 403, 'Pelanggan tidak berada di wilayah tugas Anda.');
        abort_if($bill->payment_status === 'lunas', 422, 'Tagihan pelanggan sudah lunas.');
        abort_unless(
            $bill->receipts()->where('status', 'printed')->exists(),
            422,
            'Pembayaran belum dapat dicatat karena kwitansi fisik belum dicetak admin.'
        );
        $proofPath = $request->file('proof')?->store('payment-proofs', 'public');
        $qrisProofPath = $request->file('qris_proof')?->store('payment-proofs/qris', 'public');

        DB::transaction(function () use ($bill, $validated, $proofPath, $qrisProofPath, $request) {
            $payment = Payment::query()->where('bill_id', $bill->id)->latest()->lockForUpdate()->first();

            if ($payment && in_array($payment->status, ['pending', 'verified'], true)) {
                abort(422, 'Pembayaran tagihan ini sudah pernah dicatat.');
            }

            Payment::create([
                'amount' => $bill->amountDue(),
                'bill_id' => $bill->id,
                'method' => $validated['method'],
                'note' => $validated['note'] ?? null,
                'officer_id' => $request->user()->id,
                'paid_at' => now(),
                'proof_path' => $proofPath,
                'qris_proof_path' => $qrisProofPath,
                'status' => 'pending',
            ]);

            $bill->update(['payment_status' => 'menunggu_verifikasi']);
        });

        RealtimeNotifier::updated(['field', 'deposits', 'dashboard', 'public-summary'], 'petugas.payment.created');

        return response()->json(['data' => FieldCustomerPresenter::make($bill->customer->fresh())], 201);
    }

    public function updateProof(UpdatePaymentProofRequest $request, Payment $payment): JsonResponse
    {
        $bill = $payment->bill;
        abort_unless($request->user()->canAccessCustomer($bill->customer), 403, 'Pelanggan tidak berada di wilayah tugas Anda.');
        abort_unless($payment->officer_id === $request->user()->id, 403, 'Bukti bayar ini dicatat oleh petugas lain.');
        abort_if($payment->status === 'verified', 422, 'Bukti bayar tidak bisa diubah karena setoran sudah diverifikasi Admin.');

        DB::transaction(function () use ($request, $payment) {
            if ($request->hasFile('proof')) {
                if ($payment->proof_path) {
                    Storage::disk('public')->delete($payment->proof_path);
                }
                $payment->proof_path = $request->file('proof')->store('payment-proofs', 'public');
            }

            if ($request->hasFile('qris_proof')) {
                if ($payment->qris_proof_path) {
                    Storage::disk('public')->delete($payment->qris_proof_path);
                }
                $payment->qris_proof_path = $request->file('qris_proof')->store('payment-proofs/qris', 'public');
            }

            if ($request->filled('method')) {
                $payment->method = $request->validated('method');
            }

            $payment->save();
        });

        RealtimeNotifier::updated(['field', 'deposits', 'dashboard'], 'petugas.payment.proof_updated');

        return response()->json(['data' => FieldCustomerPresenter::make($bill->customer->fresh())]);
    }
}
