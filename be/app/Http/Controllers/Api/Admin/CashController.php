<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\CashTransferRequest;
use App\Http\Requests\Api\Admin\StoreCashIncomeRequest;
use App\Http\Resources\CashTransactionResource;
use App\Models\CashAccount;
use App\Models\CashTransaction;
use App\Services\CashLedgerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashController extends Controller
{
    public function __construct(private readonly CashLedgerService $ledger) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => CashAccount::query()->orderBy('id')->get()->map(fn (CashAccount $account) => [
                'balance' => (int) round((float) $account->current_balance),
                'code' => $account->code,
                'currency' => $account->currency,
                'id' => $account->id,
                'name' => $account->name,
                'opening_balance' => (int) round((float) $account->opening_balance),
                'opening_balance_locked_at' => $account->opening_balance_locked_at?->toIso8601String(),
                'type' => $account->type,
            ]),
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_id' => ['nullable', 'integer', 'exists:cash_accounts,id'],
            'from' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'type' => ['nullable', 'in:income,expense,transfer,adjustment'],
        ]);
        $query = CashTransaction::query()->with('creator')->where('status', 'posted');
        $query->when($validated['account_id'] ?? null, fn ($builder, $value) => $builder->where('cash_account_id', $value));
        $query->when($validated['from'] ?? null, fn ($builder, $value) => $builder->whereDate('transaction_at', '>=', $value));
        $query->when($validated['to'] ?? null, fn ($builder, $value) => $builder->whereDate('transaction_at', '<=', $value));
        $query->when($validated['type'] ?? null, function ($builder, $value) {
            $value === 'transfer' ? $builder->whereIn('type', ['transfer_in', 'transfer_out']) : $builder->where('type', $value);
        });
        $transactions = $query->latest('transaction_at')->paginate(min((int) ($validated['per_page'] ?? 25), 100));

        return CashTransactionResource::collection($transactions)->response();
    }

    public function transfer(CashTransferRequest $request): JsonResponse
    {
        $transactions = $this->ledger->transfer($request->validated(), $request->user());
        $transactions->each(fn ($transaction) => $transaction->load('creator'));

        return response()->json([
            'data' => CashTransactionResource::collection($transactions),
            'message' => 'Mutasi antar kas berhasil diposting.',
        ], 201);
    }

    public function income(StoreCashIncomeRequest $request): JsonResponse
    {
        $transaction = $this->ledger->addIncome($request->validated(), $request->user());

        return response()->json([
            'data' => new CashTransactionResource($transaction->load('creator')),
            'message' => 'Pemasukan kas berhasil dicatat.',
        ], 201);
    }
}
