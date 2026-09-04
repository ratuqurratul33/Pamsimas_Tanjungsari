<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tariffs', function (Blueprint $table) {
            $table->id();
            $table->decimal('water_rate_per_m3', 12, 2);
            $table->decimal('admin_fee', 12, 2)->default(0);
            $table->date('effective_from');
            $table->date('effective_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('meter_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('period_month');
            $table->unsignedSmallInteger('period_year');
            $table->unsignedInteger('previous_meter');
            $table->unsignedInteger('current_meter');
            $table->unsignedInteger('usage');
            $table->date('recorded_at');
            $table->timestamps();
            $table->unique(['customer_id', 'period_month', 'period_year']);
        });

        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('meter_reading_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('tariff_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('period_month');
            $table->unsignedSmallInteger('period_year');
            $table->decimal('water_rate', 12, 2)->default(0);
            $table->decimal('admin_fee', 12, 2)->default(0);
            $table->unsignedInteger('usage')->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->enum('print_status', ['belum_dicetak', 'sudah_dicetak'])->default('belum_dicetak');
            $table->enum('payment_status', ['belum_input_meter', 'sudah_input_meter', 'belum_lunas', 'menunggu_verifikasi', 'lunas', 'ditolak'])->default('belum_input_meter');
            $table->date('due_date')->nullable();
            $table->timestamps();
            $table->unique(['customer_id', 'period_month', 'period_year']);
        });

        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bill_id')->constrained()->cascadeOnDelete();
            $table->foreignId('printed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('receipt_number')->unique();
            $table->timestamp('printed_at')->nullable();
            $table->json('template_snapshot')->nullable();
            $table->timestamps();
        });

        Schema::create('officer_deposits', function (Blueprint $table) {
            $table->id();
            $table->string('deposit_number')->unique();
            $table->foreignId('officer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('period_month');
            $table->unsignedSmallInteger('period_year');
            $table->decimal('cash_total', 12, 2)->default(0);
            $table->decimal('qris_total', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->string('proof_path')->nullable();
            $table->enum('status', ['draft', 'pending', 'verified', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bill_id')->constrained()->cascadeOnDelete();
            $table->foreignId('officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('officer_deposit_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('method', ['tunai', 'qris']);
            $table->decimal('amount', 12, 2);
            $table->string('proof_path')->nullable();
            $table->text('note')->nullable();
            $table->enum('status', ['pending', 'verified', 'rejected'])->default('pending');
            $table->text('rejection_reason')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('officer_deposits');
        Schema::dropIfExists('receipts');
        Schema::dropIfExists('bills');
        Schema::dropIfExists('meter_readings');
        Schema::dropIfExists('tariffs');
    }
};
