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
        Schema::create('timezones', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 64)->unique();
            $this->auditColumns($table, includeStatus: false);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timezones');
    }
};
