<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('system_settings')) {
            return;
        }

        DB::table('system_settings')->where('key', 'theme')->where('value', 'sidebar')->update(['value' => 'canvas']);
        DB::table('system_settings')->where('key', 'theme')->where('value', 'header')->update(['value' => 'horizon']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('system_settings')) {
            return;
        }

        DB::table('system_settings')->where('key', 'theme')->where('value', 'canvas')->update(['value' => 'sidebar']);
        DB::table('system_settings')->where('key', 'theme')->where('value', 'horizon')->update(['value' => 'header']);
    }
};
