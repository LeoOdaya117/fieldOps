<?php

use App\Support\Database\DefinesAuditColumns;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    use DefinesAuditColumns;

    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 160);
            $table->string('category', 80);
            $table->string('condition', 32)->default('operational');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $this->auditColumns($table, includeStatus: false);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
