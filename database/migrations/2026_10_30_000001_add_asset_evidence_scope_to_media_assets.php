<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media_assets', static function (Blueprint $table): void {
            $table->foreignId('asset_id')->nullable()->after('module')->constrained('assets')->restrictOnDelete();
            $table->index(['module', 'asset_id', 'record_status', 'created_at', 'id'], 'media_assets_asset_evidence_scope_index');
        });
        Schema::table('access_audit_events', static function (Blueprint $table): void {
            $table->index(['subject_type', 'subject_id', 'occurred_at', 'id'], 'access_audit_asset_history_index');
        });
    }

    public function down(): void
    {
        Schema::table('access_audit_events', static function (Blueprint $table): void {
            $table->dropIndex('access_audit_asset_history_index');
        });
        Schema::table('media_assets', static function (Blueprint $table): void {
            $table->dropIndex('media_assets_asset_evidence_scope_index');
            $table->dropConstrainedForeignId('asset_id');
        });
    }
};
