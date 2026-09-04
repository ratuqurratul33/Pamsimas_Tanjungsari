<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Admin\PostExpenseRequest;
use App\Http\Requests\Api\Admin\StoreExpenseRequest;
use App\Http\Requests\Api\Admin\UpdateExpenseRequest;
use App\Http\Requests\Api\Admin\VoidExpenseRequest;
use App\Http\Resources\CashTransactionResource;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private readonly ExpenseService $expenseService) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['nullable', 'string', 'max:120'],
            'from' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
            'status' => ['nullable', 'in:draft,posted,rejected,voided'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $expenses = Expense::query()
            ->with(['cashAccount', 'cashTransaction', 'creator'])
            ->when($validated['status'] ?? null, fn ($query, $value) => $query->where('status', $value))
            ->when($validated['category'] ?? null, fn ($query, $value) => $query->where('category', $value))
            ->when($validated['from'] ?? null, fn ($query, $value) => $query->whereDate('expense_date', '>=', $value))
            ->when($validated['to'] ?? null, fn ($query, $value) => $query->whereDate('expense_date', '<=', $value))
            ->latest('expense_date')
            ->paginate(min((int) ($validated['per_page'] ?? 25), 100));

        return ExpenseResource::collection($expenses)->response();
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $validated = $request->safe()->except('proof');
        $validated['proof_path'] = $request->file('proof')?->store('expense-proofs', 'public');
        $validated['status'] = 'draft';
        $expense = Expense::create([...$validated, 'created_by' => $request->user()->id]);

        return response()->json([
            'data' => new ExpenseResource($expense->load(['cashAccount', 'creator'])),
            'message' => 'Draft pengeluaran berhasil dibuat.',
        ], 201);
    }

    public function update(UpdateExpenseRequest $request, Expense $expense): JsonResponse
    {
        $validated = $request->safe()->except('proof');

        if ($request->hasFile('proof')) {
            $validated['proof_path'] = $request->file('proof')->store('expense-proofs', 'public');
        }

        $updated = $this->expenseService->update($expense, $validated, $request->user());

        return response()->json([
            'data' => new ExpenseResource($updated),
            'message' => 'Pengeluaran berhasil diperbarui.',
        ]);
    }

    public function post(PostExpenseRequest $request, Expense $expense): JsonResponse
    {
        $result = $this->expenseService->post($expense, $request->validated(), $request->user());

        return response()->json([
            'data' => [
                'cash_transaction' => new CashTransactionResource($result['transaction']->load('creator')),
                'expense' => new ExpenseResource($result['expense']),
            ],
            'message' => 'Pengeluaran berhasil diposting dan saldo kas berkurang.',
        ]);
    }

    public function void(VoidExpenseRequest $request, Expense $expense): JsonResponse
    {
        $result = $this->expenseService->void($expense, $request->validated(), $request->user());

        return response()->json([
            'data' => [
                'cash_transaction' => new CashTransactionResource($result['transaction']->load('creator')),
                'expense' => new ExpenseResource($result['expense']),
            ],
            'message' => 'Pengeluaran dibatalkan dan saldo dikembalikan melalui transaksi pembalik.',
        ]);
    }
}
