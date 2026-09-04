<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('regions')->nullOnDelete();
            $table->enum('type', ['dusun', 'rw', 'rt']);
            $table->string('code')->nullable();
            $table->string('name');
            $table->string('kampung')->nullable();
            $table->unsignedInteger('household_count')->default(0);
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('customer_code')->unique();
            $table->foreignId('dusun_id')->nullable()->constrained('regions')->nullOnDelete();
            $table->foreignId('rt_id')->nullable()->constrained('regions')->nullOnDelete();
            $table->string('name');
            $table->text('address');
            $table->enum('status', ['aktif', 'menunggak', 'nonaktif'])->default('aktif');
            $table->date('joined_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('officer_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('officer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('region_id')->constrained('regions')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['officer_id', 'region_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('officer_assignments');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('regions');
    }
};
