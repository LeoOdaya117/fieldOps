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
            $table->foreignId('user_id')
                ->nullable()
                ->after('ip_address')
                ->constrained('users')
                ->nullOnDelete();
            $table->index('user_id');
        });

        DB::table('blocked_ip_addresses')
            ->whereNull('user_id')
            ->orderBy('id')
            ->chunkById(100, static function ($rules): void {
                foreach ($rules as $rule) {
                    $userId = DB::table('visit_logs')
                        ->where('ip_address', $rule->ip_address)
                        ->whereNotNull('user_id')
                        ->orderByDesc('occurred_at')
                        ->orderByDesc('id')
                        ->value('user_id');

                    if ($userId !== null) {
                        DB::table('blocked_ip_addresses')
                            ->where('id', $rule->id)
                            ->whereNull('user_id')
                            ->update(['user_id' => $userId]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('blocked_ip_addresses', static function (Blueprint $table): void {
            $table->dropForeign(['user_id']);
            $table->dropIndex(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};
