<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organization_locations', static function (Blueprint $table): void {
            $table->id();
            $table->string('scope', 32)->unique()->default('primary');
            $table->char('region_code', 10)->nullable();
            $table->char('province_code', 10)->nullable();
            $table->char('locality_code', 10)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('record_status')->default(1)->index();
            $table->timestamps();

            $table->foreign('region_code')->references('code')->on('psgc_regions')->restrictOnDelete();
            $table->foreign('province_code')->references('code')->on('psgc_provinces')->restrictOnDelete();
            $table->foreign('locality_code')->references('code')->on('psgc_localities')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_locations');
    }
};
