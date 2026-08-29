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
        Schema::table('users', function (Blueprint $table): void {
            $this->auditColumns($table, includeStatus: false, includeTimestamps: false);
        });

        Schema::table('roles', function (Blueprint $table): void {
            $this->auditColumns($table, includeTimestamps: false);
        });

        Schema::table('user_invitations', function (Blueprint $table): void {
            $this->auditColumns($table, includeTimestamps: false);
        });
    }

    public function down(): void
    {
        Schema::table('user_invitations', static function (Blueprint $table): void {
            $table->dropConstrainedForeignId('updated_by');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['status', 'record_status']);
        });

        Schema::table('roles', static function (Blueprint $table): void {
            $table->dropConstrainedForeignId('updated_by');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['status', 'record_status']);
        });

        Schema::table('users', static function (Blueprint $table): void {
            $table->dropConstrainedForeignId('updated_by');
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn('record_status');
        });
    }
};
