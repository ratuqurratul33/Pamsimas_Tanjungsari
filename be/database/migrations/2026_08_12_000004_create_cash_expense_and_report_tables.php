<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_accounts', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['tunai', 'qris'])->unique();
            $table->string('name');
            $table->decimal('opening_balance', 12, 2)->default(0);
            $table->decimal('current_balance', 12, 2)->default(0);
            $table->date('opening_balance_period')->nullable();
            $table->timestamp('opening_balance_locked_at')->nullable();
            $table->foreignId('opening_balance_locked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_account_id')->constrained()->cascadeOnDelete();
            $table->nullableMorphs('reference');
            $table->enum('type', ['income', 'expense', 'transfer_in', 'transfer_out', 'adjustment']);
            $table->decimal('amount', 12, 2);
            $table->decimal('balance_after', 12, 2)->default(0);
            $table->text('description');
            $table->timestamp('transaction_at');
            $table->timestamps();
        });

        Schema::create('cash_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_cash_account_id')->constrained('cash_accounts')->restrictOnDelete();
            $table->foreignId('to_cash_account_id')->constrained('cash_accounts')->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->text('note')->nullable();
            $table->date('transfer_date');
            $table->timestamps();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_account_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category');
            $table->unsignedInteger('quantity')->default(1);
            $table->string('unit')->default('Pcs');
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('amount', 12, 2);
            $table->text('description');
            $table->string('proof_path')->nullable();
            $table->boolean('is_public')->default(false);
            $table->date('expense_date');
            $table->timestamps();
        });

        Schema::create('monthly_reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('period_month')->nullable();
            $table->unsignedSmallInteger('period_year');
            $table->enum('scope', ['monthly', 'quarterly', 'yearly'])->default('monthly');
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('opening_balance', 12, 2)->default(0);
            $table->decimal('verified_income_total', 12, 2)->default(0);
            $table->decimal('expense_total', 12, 2)->default(0);
            $table->decimal('transfer_total', 12, 2)->default(0);
            $table->decimal('ending_balance', 12, 2)->default(0);
            $table->json('snapshot')->nullable();
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_reports');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('cash_transfers');
        Schema::dropIfExists('cash_transactions');
        Schema::dropIfExists('cash_accounts');
    }
};
