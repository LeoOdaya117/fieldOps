<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visit_logs', static function (Blueprint $table): void {
            $table->decimal('location_accuracy_meters', 12, 2)
                ->nullable()
                ->after('location_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('visit_logs', static function (Blueprint $table): void {
            $table->dropColumn('location_accuracy_meters');
        });
    }
};
