<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('title');
            $table->text('description');
            $table->text('vision')->nullable();
            $table->text('mission')->nullable();
            $table->text('address')->nullable();
            $table->string('contact')->nullable();
            $table->string('email')->nullable();
            $table->string('logo_path')->nullable();
            $table->timestamps();
        });

        Schema::create('organization_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_profile_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('position');
            $table->string('photo_path')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('public_map_settings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('coverage')->nullable();
            $table->enum('status', ['normal', 'perhatian'])->default('normal');
            $table->string('map_image_path')->nullable();
            $table->json('route_points')->nullable();
            $table->json('radius_plans')->nullable();
            $table->timestamps();
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

        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('complaint_number')->unique();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('area')->nullable();
            $table->string('category');
            $table->text('description');
            $table->string('photo_path')->nullable();
            $table->enum('status', ['baru', 'diproses', 'selesai', 'ditolak'])->default('baru');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('public_map_layers');
        Schema::dropIfExists('public_map_settings');
        Schema::dropIfExists('organization_members');
        Schema::dropIfExists('organization_profiles');
    }
};
