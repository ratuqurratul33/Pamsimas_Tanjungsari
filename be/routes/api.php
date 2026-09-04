<?php

use App\Http\Controllers\Api\Admin\AccountController;
use App\Http\Controllers\Api\Admin\CashController;
use App\Http\Controllers\Api\Admin\CustomerController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DepositController;
use App\Http\Controllers\Api\Admin\ExpenseController;
use App\Http\Controllers\Api\Admin\OfficerController;
use App\Http\Controllers\Api\Admin\ProfileController;
use App\Http\Controllers\Api\Admin\PublicMapController;
use App\Http\Controllers\Api\Admin\ReceiptController;
use App\Http\Controllers\Api\Admin\RegionController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\SettingController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\Petugas\AccountController as PetugasAccountController;
use App\Http\Controllers\Api\Petugas\CustomerController as PetugasCustomerController;
use App\Http\Controllers\Api\Petugas\DashboardController as PetugasDashboardController;
use App\Http\Controllers\Api\Petugas\DepositController as PetugasDepositController;
use App\Http\Controllers\Api\Petugas\MeterReadingController;
use App\Http\Controllers\Api\Petugas\PaymentController;
use App\Http\Controllers\Api\Publik\ContentController;
use App\Http\Controllers\Api\Publik\TransparencyController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/otp/request', [OtpController::class, 'requestCode'])->middleware('throttle:10,1');
Route::post('/auth/otp/reset', [OtpController::class, 'resetPassword'])->middleware('throttle:10,1');

Route::prefix('publik')->group(function () {
    Route::get('/summary', [ContentController::class, 'summary']);
    Route::get('/faqs', [ContentController::class, 'faqs']);
    Route::get('/map', [PublicMapController::class, 'show']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::get('/transparency', TransparencyController::class);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/account', [AccountController::class, 'show']);
        Route::patch('/account', [AccountController::class, 'update']);
        Route::get('/dashboard', DashboardController::class);
        Route::get('/transparency', TransparencyController::class);
        Route::apiResource('/customers', CustomerController::class);
        Route::get('/regions', [RegionController::class, 'index']);
        Route::get('/regions/parents', [RegionController::class, 'parents']);
        Route::post('/regions', [RegionController::class, 'store']);
        Route::apiResource('/officers', OfficerController::class);
        Route::get('/receipts', [ReceiptController::class, 'index']);
        Route::patch('/meter-readings/{meterReading}', [ReceiptController::class, 'updateMeterReading']);
        Route::post('/receipts/batch-print', [ReceiptController::class, 'store'])->middleware('idempotent');
        Route::post('/receipts/batches', [ReceiptController::class, 'store'])->middleware('idempotent');
        Route::get('/receipts/batches/{batch}', [ReceiptController::class, 'showBatch']);
        Route::get('/receipts/batches/{batch}/pdf', [ReceiptController::class, 'downloadPdf']);
        Route::post('/receipts/batches/{batch}/pdf', [ReceiptController::class, 'regeneratePdf']);
        Route::get('/deposits', [DepositController::class, 'index']);
        Route::get('/deposits/stats', [DepositController::class, 'stats']);
        Route::get('/deposits/{deposit}', [DepositController::class, 'show']);
        Route::post('/deposits/{deposit}/verify', [DepositController::class, 'verify'])->middleware('idempotent');
        Route::patch('/deposits/{deposit}/payments/{payment}', [DepositController::class, 'updatePaymentStatus'])->middleware('idempotent');
        Route::post('/deposits/{deposit}/payments/{payment}/reject', [DepositController::class, 'rejectPayment'])->middleware('idempotent');
        Route::get('/cash-accounts', [CashController::class, 'index']);
        Route::get('/cash-transactions', [CashController::class, 'transactions']);
        Route::post('/cash-transactions/income', [CashController::class, 'income'])->middleware('idempotent');
        Route::post('/cash-transactions/transfer', [CashController::class, 'transfer'])->middleware('idempotent');
        Route::apiResource('/expenses', ExpenseController::class)->only(['index', 'store', 'update']);
        Route::post('/expenses/{expense}/post', [ExpenseController::class, 'post'])->middleware('idempotent');
        Route::post('/expenses/{expense}/void', [ExpenseController::class, 'void'])->middleware('idempotent');
        Route::get('/reports', [ReportController::class, 'index']);
        Route::get('/reports/monthly', [ReportController::class, 'monthly']);
        Route::post('/reports', [ReportController::class, 'store']);
        Route::get('/settings', [SettingController::class, 'index']);
        Route::patch('/settings', [SettingController::class, 'update']);
        Route::post('/settings/faqs', [SettingController::class, 'storeFaq']);
        Route::put('/settings/faqs', [SettingController::class, 'replaceFaqs']);
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::patch('/profile', [ProfileController::class, 'update']);
        Route::get('/public-map', [PublicMapController::class, 'show']);
        Route::patch('/public-map', [PublicMapController::class, 'update']);
    });

    Route::prefix('petugas')->middleware('role:petugas')->group(function () {
        Route::get('/account', [PetugasAccountController::class, 'show']);
        Route::get('/dashboard', PetugasDashboardController::class);
        Route::get('/customers', [PetugasCustomerController::class, 'index']);
        Route::get('/deposits', [PetugasDepositController::class, 'index']);
        Route::post('/deposits', [PetugasDepositController::class, 'store'])->middleware('idempotent');
        Route::post('/meter-readings', [MeterReadingController::class, 'store']);
        Route::post('/payments', [PaymentController::class, 'store']);
        Route::post('/payments/{payment}/proof', [PaymentController::class, 'updateProof']);
    });
});
