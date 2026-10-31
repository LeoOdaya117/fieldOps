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
        Schema::create('work_orders', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 32)->unique();
            $table->string('title', 160);
            $table->text('instructions')->nullable();
            $table->string('priority', 16);
            $table->date('due_date');
            $table->foreignId('asset_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('asset_code_snapshot', 32)->nullable();
            $table->string('asset_name_snapshot', 160)->nullable();
            $table->string('location_label', 255)->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('status', 16)->default('open')->index();
            $table->unsignedInteger('version')->default(1);
            $this->auditColumns($table, includeStatus: false);
            $table->index(['record_status', 'status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_orders');
    }
};
