<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blocked_ip_addresses', static function (Blueprint $table): void {
            $table->timestamp('blocked_at')->nullable()->change();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        DB::table('blocked_ip_addresses')
            ->whereNull('blocked_at')
            ->update(['blocked_at' => now()]);

        Schema::table('blocked_ip_addresses', static function (Blueprint $table): void {
            $table->dropIndex('blocked_ip_addresses_last_seen_at_index');
            $table->dropColumn(['first_seen_at', 'last_seen_at']);
            $table->timestamp('blocked_at')->nullable(false)->change();
        });
    }
};
