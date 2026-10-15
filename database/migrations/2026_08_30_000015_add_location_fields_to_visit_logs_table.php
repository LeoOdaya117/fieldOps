<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visit_logs', static function (Blueprint $table): void {
            $table->string('location_source', 20)->nullable()->after('ip_address');
            $table->char('location_country_code', 2)->nullable()->after('location_source');
            $table->string('location_region')->nullable()->after('location_country_code');
            $table->string('location_city')->nullable()->after('location_region');
            $table->decimal('location_latitude', 10, 7)->nullable()->after('location_city');
            $table->decimal('location_longitude', 10, 7)->nullable()->after('location_latitude');
            $table->string('location_timezone', 64)->nullable()->after('location_longitude');

            $table->index(['location_country_code', 'occurred_at']);
            $table->index(['location_city', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::table('visit_logs', static function (Blueprint $table): void {
            $table->dropIndex(['location_country_code', 'occurred_at']);
            $table->dropIndex(['location_city', 'occurred_at']);
            $table->dropColumn([
                'location_source',
                'location_country_code',
                'location_region',
                'location_city',
                'location_latitude',
                'location_longitude',
                'location_timezone',
            ]);
        });
    }
};
