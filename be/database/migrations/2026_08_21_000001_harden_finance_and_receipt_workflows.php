<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_number')->unique();
            $table->unsignedSmallInteger('period_month');
            $table->unsignedSmallInteger('period_year');
            $table->foreignId('officer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('receipt_count')->default(0);
            $table->unsignedInteger('page_count')->default(0);
            $table->unsignedTinyInteger('slots_per_page')->default(4);
            $table->unsignedTinyInteger('empty_slots')->default(0);
            $table->enum('status', ['draft', 'printed', 'cancelled'])->default('draft');
            $table->string('file_path')->nullable();
            $table->timestamp('printed_at')->nullable();
            $table->foreignId('printed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['period_year', 'period_month', 'officer_id']);
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->unsignedBigInteger('bill_id')->nullable()->change();
            $table->foreignId('receipt_batch_id')->nullable()->after('id')->constrained('receipt_batches')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->after('bill_id')->constrained()->nullOnDelete();
            $table->foreignId('officer_id')->nullable()->after('customer_id')->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('period_month')->nullable()->after('officer_id');
            $table->unsignedSmallInteger('period_year')->nullable()->after('period_month');
            $table->enum('status', ['queued', 'printed', 'cancelled'])->default('queued')->after('period_year');
            $table->string('customer_name_snapshot')->nullable()->after('status');
            $table->text('customer_address_snapshot')->nullable()->after('customer_name_snapshot');
            $table->index(['period_year', 'period_month', 'officer_id', 'status'], 'receipts_period_officer_status_index');
            $table->unique(['customer_id', 'period_year', 'period_month'], 'receipts_customer_period_unique');
        });

        Schema::table('officer_deposits', function (Blueprint $table) {
            $table->timestamp('received_at')->nullable()->after('submitted_at');
            $table->decimal('cash_counted', 12, 2)->nullable()->after('received_amount');
            $table->decimal('qris_confirmed', 12, 2)->nullable()->after('cash_counted');
            $table->text('handed_over_note')->nullable()->after('proof_path');
            $table->text('verification_note')->nullable()->after('rejection_reason');
            $table->index(['status', 'received_at']);
        });

        Schema::table('cash_accounts', function (Blueprint $table) {
            $table->string('code')->nullable()->unique()->after('id');
            $table->string('currency', 3)->default('IDR')->after('name');
        });

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->enum('status', ['posted', 'voided'])->default('posted')->after('type');
            $table->foreignId('created_by')->nullable()->after('description')->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable()->after('transaction_at');
            $table->foreignId('voided_by')->nullable()->after('voided_at')->constrained('users')->nullOnDelete();
            $table->unique(
                ['cash_account_id', 'reference_type', 'reference_id', 'type'],
                'cash_transactions_source_account_type_unique'
            );
            $table->index(['status', 'transaction_at']);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->string('vendor')->nullable()->after('category');
            $table->enum('payment_method', ['cash', 'bank', 'qris'])->default('cash')->after('vendor');
            $table->string('reference_number')->nullable()->after('description');
            $table->enum('status', ['draft', 'posted', 'rejected', 'voided'])->default('draft')->after('expense_date');
            $table->foreignId('cash_transaction_id')->nullable()->after('status')->constrained('cash_transactions')->nullOnDelete();
            $table->timestamp('posted_at')->nullable()->after('cash_transaction_id');
            $table->foreignId('posted_by')->nullable()->after('posted_at')->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable()->after('posted_by');
            $table->foreignId('voided_by')->nullable()->after('voided_at')->constrained('users')->nullOnDelete();
            $table->text('posting_note')->nullable()->after('voided_by');
            $table->index(['status', 'expense_date']);
        });

        Schema::create('idempotency_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('key', 100);
            $table->string('route');
            $table->char('request_hash', 64);
            $table->unsignedSmallInteger('response_status')->nullable();
            $table->json('response_body')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_requests');

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['cash_transaction_id']);
            $table->dropForeign(['posted_by']);
            $table->dropForeign(['voided_by']);
            $table->dropIndex(['status', 'expense_date']);
            $table->dropColumn([
                'vendor', 'payment_method', 'reference_number', 'status', 'cash_transaction_id',
                'posted_at', 'posted_by', 'voided_at', 'voided_by', 'posting_note',
            ]);
        });

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->dropUnique('cash_transactions_source_account_type_unique');
            $table->dropIndex(['status', 'transaction_at']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['voided_by']);
            $table->dropColumn(['status', 'created_by', 'voided_at', 'voided_by']);
        });

        Schema::table('cash_accounts', function (Blueprint $table) {
            $table->dropUnique(['code']);
            $table->dropColumn(['code', 'currency']);
        });

        Schema::table('officer_deposits', function (Blueprint $table) {
            $table->dropIndex(['status', 'received_at']);
            $table->dropColumn(['received_at', 'cash_counted', 'qris_confirmed', 'handed_over_note', 'verification_note']);
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->dropUnique('receipts_customer_period_unique');
            $table->dropIndex('receipts_period_officer_status_index');
            $table->dropForeign(['receipt_batch_id']);
            $table->dropForeign(['customer_id']);
            $table->dropForeign(['officer_id']);
            $table->dropColumn([
                'receipt_batch_id', 'customer_id', 'officer_id', 'period_month', 'period_year',
                'status', 'customer_name_snapshot', 'customer_address_snapshot',
            ]);
            $table->unsignedBigInteger('bill_id')->nullable(false)->change();
        });

        Schema::dropIfExists('receipt_batches');
    }
};
