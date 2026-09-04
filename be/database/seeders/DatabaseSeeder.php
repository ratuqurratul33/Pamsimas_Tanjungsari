<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $seedDemoData = filter_var(env('SEED_DEMO_DATA', false), FILTER_VALIDATE_BOOLEAN);

        $this->call($seedDemoData ? PamsimasSeeder::class : PamsimasCoreSeeder::class);
    }
}
