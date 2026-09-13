<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('psgc_reference_releases', static function (Blueprint $table): void {
            $table->id();
            $table->string('release', 16)->unique();
            $table->date('reference_date');
            $table->string('source_url', 500);
            $table->char('checksum', 64);
            $table->unsignedSmallInteger('region_count');
            $table->unsignedSmallInteger('province_count');
            $table->unsignedSmallInteger('locality_count');
            $table->timestamp('imported_at');
        });

        Schema::create('psgc_regions', static function (Blueprint $table): void {
            $table->char('code', 10)->primary();
            $table->string('name', 160);
        });

        Schema::create('psgc_provinces', static function (Blueprint $table): void {
            $table->char('code', 10)->primary();
            $table->char('region_code', 10)->index();
            $table->string('name', 160);
            $table->foreign('region_code')->references('code')->on('psgc_regions')->restrictOnDelete();
        });

        Schema::create('psgc_localities', static function (Blueprint $table): void {
            $table->char('code', 10)->primary();
            $table->char('region_code', 10)->index();
            $table->char('province_code', 10)->nullable()->index();
            $table->string('name', 160);
            $table->string('type', 16);
            $table->boolean('is_independent')->default(false)->index();
            $table->foreign('region_code')->references('code')->on('psgc_regions')->restrictOnDelete();
            $table->foreign('province_code')->references('code')->on('psgc_provinces')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('psgc_localities');
        Schema::dropIfExists('psgc_provinces');
        Schema::dropIfExists('psgc_regions');
        Schema::dropIfExists('psgc_reference_releases');
    }
};
