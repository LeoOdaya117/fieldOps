<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->removeStatusColumn('countries');
        $this->removeStatusColumn('timezones');
    }

    public function down(): void
    {
        $this->restoreStatusColumn('countries');
        $this->restoreStatusColumn('timezones');
    }

    private function removeStatusColumn(string $tableName): void
    {
        if (! Schema::hasColumn($tableName, 'status')) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
            $table->dropIndex($tableName.'_status_name_index');
            $table->dropIndex($tableName.'_status_index');
            $table->dropColumn('status');
        });
    }

    private function restoreStatusColumn(string $tableName): void
    {
        if (Schema::hasColumn($tableName, 'status')) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($tableName): void {
            $table->string('status')->default('active')->index();
            $table->index(['status', 'name'], $tableName.'_status_name_index');
        });
    }
};
