<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('public_map_settings', function (Blueprint $table) {
            $table->text('map_note')->nullable()->after('description');
            $table->string('contact_label')->nullable()->after('status');
            $table->string('contact_whatsapp')->nullable()->after('contact_label');
            $table->string('guide_title')->nullable()->after('contact_whatsapp');
            $table->text('guide_description')->nullable()->after('guide_title');
            $table->json('guide_steps')->nullable()->after('guide_description');
        });

        Schema::table('organization_profiles', function (Blueprint $table) {
            $table->string('established')->nullable()->after('title');
            $table->string('office_hours_time')->nullable()->after('address');
            $table->string('office_hours_days')->nullable()->after('office_hours_time');
            $table->string('footer_contact_label')->nullable()->after('office_hours_days');
            $table->string('contact_whatsapp')->nullable()->after('footer_contact_label');
            $table->json('service_cards')->nullable()->after('contact_whatsapp');
        });

        Schema::table('organization_members', function (Blueprint $table) {
            $table->text('description')->nullable()->after('position');
        });
    }

    public function down(): void
    {
        Schema::table('organization_members', function (Blueprint $table) {
            $table->dropColumn('description');
        });

        Schema::table('organization_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'established',
                'office_hours_time',
                'office_hours_days',
                'footer_contact_label',
                'contact_whatsapp',
                'service_cards',
            ]);
        });

        Schema::table('public_map_settings', function (Blueprint $table) {
            $table->dropColumn([
                'map_note',
                'contact_label',
                'contact_whatsapp',
                'guide_title',
                'guide_description',
                'guide_steps',
            ]);
        });
    }
};
