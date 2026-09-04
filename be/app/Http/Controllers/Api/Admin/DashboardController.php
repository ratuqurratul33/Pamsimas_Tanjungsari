<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\CashAccount;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\OfficerDeposit;
use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $period = Setting::where('key', 'billing_period')->first()?->value ?? [];
        $month = (int) ($period['month'] ?? now()->month);
        $year = (int) ($period['year'] ?? now()->year);
        $dueDay = (int) ($period['due_day'] ?? 25);
        $daysInMonth = Carbon::create($year, $month, 1)->daysInMonth;
        $periodStart = Carbon::create($year, $month, 1);
        $dueDate = Carbon::create($year, $month, min(max($dueDay, 1), $daysInMonth));
        $lateFee = (float) (Setting::where('key', 'late_fee')->value('value') ?? 0);
        $activeCustomers = Customer::where('status', 'aktif')->count();
        $pendingDeposits = OfficerDeposit::where('status', 'pending')->count();
        $monthlyExpenses = Expense::where('status', 'posted')
            ->whereMonth('expense_date', $month)
            ->whereYear('expense_date', $year)
            ->sum('amount');
        $paidBills = Bill::where('period_month', $month)->where('period_year', $year)->where('payment_status', 'lunas')->count();
        $totalBills = Bill::where('period_month', $month)->where('period_year', $year)->count();
        $paidPercentage = $totalBills > 0 ? (int) round(($paidBills / $totalBills) * 100) : 0;

        return response()->json([
            'active_customers' => $activeCustomers,
            'billing_window' => [
                'due_day' => $dueDay,
                'is_overdue' => now()->gt($dueDate->copy()->endOfDay()),
                'late_fee' => $lateFee,
                'period_end' => $dueDate->toDateString(),
                'period_start' => $periodStart->toDateString(),
            ],
            'activity_logs' => ActivityLog::query()
                ->latest('logged_at')
                ->limit(10)
                ->get()
                ->map(fn (ActivityLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'actor_name' => $log->actor_name,
                    'description' => $log->description,
                    'logged_at' => $log->logged_at?->toIso8601String(),
                ]),
            'cash_accounts' => [
                'cash' => CashAccount::where('type', 'tunai')->value('current_balance') ?? 0,
                'qris' => CashAccount::where('type', 'qris')->value('current_balance') ?? 0,
            ],
            'monthly_expenses' => $monthlyExpenses,
            'payment' => [
                'paid_percentage' => $paidPercentage,
                'unpaid_percentage' => $totalBills > 0 ? 100 - $paidPercentage : 0,
            ],
            'pending_deposits' => $pendingDeposits,
            'period_label' => sprintf('%02d/%d', $month, $year),
        ]);
    }
}
