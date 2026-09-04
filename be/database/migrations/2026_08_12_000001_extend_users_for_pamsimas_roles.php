<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('name');
            $table->enum('role', ['admin', 'petugas'])->default('petugas')->after('password');
            $table->string('phone')->nullable()->after('role');
            $table->enum('gender', ['laki-laki', 'perempuan'])->nullable()->after('phone');
            $table->string('avatar')->nullable()->after('gender');
            $table->string('photo_path')->nullable()->after('avatar');
            $table->enum('status', ['aktif', 'nonaktif'])->default('aktif')->after('photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'role', 'phone', 'gender', 'avatar', 'photo_path', 'status']);
        });
    }
};
