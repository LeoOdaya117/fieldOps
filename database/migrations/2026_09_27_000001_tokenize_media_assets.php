<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media_assets', static function (Blueprint $table): void {
            $table->string('token', 64)->nullable()->unique();
            $table->string('module', 32)->default('gallery')->index();
            $table->string('tag', 64)->nullable();
            $table->string('thumbnail_path', 500)->nullable()->change();
            $table->unsignedSmallInteger('width')->nullable()->change();
            $table->unsignedSmallInteger('height')->nullable()->change();
        });

        DB::table('media_assets')->orderBy('id')->chunkById(100, static function ($assets): void {
            foreach ($assets as $asset) {
                if ($asset->token === null) {
                    DB::table('media_assets')->where('id', $asset->id)->update(['token' => Str::random(48)]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('media_assets', static function (Blueprint $table): void {
            $table->dropUnique(['token']);
            $table->dropIndex(['module']);
            $table->dropColumn(['token', 'module', 'tag']);
        });
    }
};
