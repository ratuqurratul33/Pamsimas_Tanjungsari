<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('public_map_layers');

        Schema::table('public_map_settings', function (Blueprint $table) {
            $table->dropColumn(['radius_plans', 'route_points']);
        });
    }

    public function down(): void
    {
        Schema::table('public_map_settings', function (Blueprint $table) {
            $table->json('radius_plans')->nullable();
            $table->json('route_points')->nullable();
        });

        Schema::create('public_map_layers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('public_map_setting_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color')->default('#0070a0');
            $table->boolean('is_enabled')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }
};
