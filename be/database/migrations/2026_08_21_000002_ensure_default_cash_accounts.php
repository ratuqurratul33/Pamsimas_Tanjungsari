<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cash_accounts')) {
            return;
        }

        $now = now();
        $defaults = [
            ['code' => 'KAS-TUNAI', 'currency' => 'IDR', 'current_balance' => 0, 'name' => 'Kas Tunai', 'opening_balance' => 0, 'type' => 'tunai'],
            ['code' => 'KAS-QRIS', 'currency' => 'IDR', 'current_balance' => 0, 'name' => 'Kas QRIS', 'opening_balance' => 0, 'type' => 'qris'],
        ];

        foreach ($defaults as $account) {
            if (! DB::table('cash_accounts')->where('type', $account['type'])->exists()) {
                DB::table('cash_accounts')->insert([...$account, 'created_at' => $now, 'updated_at' => $now]);
            }
        }
    }

    public function down(): void
    {
        // Do not remove accounts or their ledger history during rollback.
    }
};
