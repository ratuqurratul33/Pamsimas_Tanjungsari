<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MonthlyReport;
use App\Services\MonthlyReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private readonly MonthlyReportService $reportService) {}

    public function index(Request $request): JsonResponse
    {
        return $this->monthly($request);
    }

    public function monthly(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dusun_id' => ['nullable', 'integer', 'exists:regions,id'],
            'officer_id' => ['nullable', 'integer', 'exists:users,id'],
            'period' => ['required', 'date_format:Y-m'],
        ]);

        return response()->json([
            'data' => $this->reportService->build(
                $validated['period'],
                $validated['officer_id'] ?? null,
                $validated['dusun_id'] ?? null,
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['period' => ['required', 'date_format:Y-m']]);
        $snapshot = $this->reportService->build($validated['period']);
        [$year, $month] = array_map('intval', explode('-', $validated['period']));
        $report = MonthlyReport::query()->updateOrCreate(
            ['period_month' => $month, 'period_year' => $year, 'scope' => 'monthly'],
            [
                'ending_balance' => $snapshot['cash']['closing_balance'],
                'expense_total' => $snapshot['cash']['expense_amount'],
                'generated_at' => now(),
                'generated_by' => $request->user()->id,
                'opening_balance' => $snapshot['cash']['opening_balance'],
                'period_end' => now()->setDate($year, $month, 1)->endOfMonth()->toDateString(),
                'period_start' => sprintf('%04d-%02d-01', $year, $month),
                'snapshot' => $snapshot,
                'transfer_total' => $snapshot['cash']['transfer_amount'],
                'verified_income_total' => $snapshot['cash']['income_from_verified_deposits'],
            ],
        );

        return response()->json([
            'data' => $report,
            'message' => 'Snapshot laporan bulanan berhasil disimpan.',
        ], 201);
    }
}
