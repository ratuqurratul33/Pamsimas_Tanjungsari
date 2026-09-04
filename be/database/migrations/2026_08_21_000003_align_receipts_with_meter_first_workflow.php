<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('receipts')
            ->where('status', 'queued')
            ->where(function ($query) {
                $query->whereNull('bill_id')
                    ->orWhereNotExists(function ($billQuery) {
                        $billQuery->selectRaw('1')
                            ->from('bills')
                            ->join('meter_readings', 'meter_readings.id', '=', 'bills.meter_reading_id')
                            ->whereColumn('bills.id', 'receipts.bill_id');
                    });
            })
            ->delete();

        Schema::table('receipt_batches', function (Blueprint $table) {
            $table->unsignedTinyInteger('slots_per_page')->default(3)->change();
        });
    }

    public function down(): void
    {
        Schema::table('receipt_batches', function (Blueprint $table) {
            $table->unsignedTinyInteger('slots_per_page')->default(4)->change();
        });
    }
};
