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
        Schema::table('blocked_ip_addresses', function (Blueprint $table): void {
            $this->auditColumns($table, includeStatus: false, includeTimestamps: false);
        });
    }

    public function down(): void
    {
        Schema::table('blocked_ip_addresses', static function (Blueprint $table): void {
            $table->dropConstrainedForeignId('updated_by');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn('record_status');
        });
    }
};
