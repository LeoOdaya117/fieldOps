<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_assets', static function (Blueprint $table): void {
            $table->id();
            $table->foreignId('uploader_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('disk', 64);
            $table->string('path', 500)->unique();
            $table->string('thumbnail_path', 500)->unique();
            $table->string('original_name');
            $table->string('mime_type', 64);
            $table->string('extension', 8);
            $table->unsignedBigInteger('size_bytes');
            $table->unsignedSmallInteger('width');
            $table->unsignedSmallInteger('height');
            $table->string('source', 16);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('record_status')->default(1)->index();
            $table->timestamps();

            $table->index(['uploader_id', 'created_at']);
        });

        Schema::create('platform_image_assignments', static function (Blueprint $table): void {
            $table->string('slot', 64)->primary();
            $table->foreignId('media_asset_id')->nullable()->constrained('media_assets')->restrictOnDelete();
            $table->unsignedBigInteger('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_image_assignments');
        Schema::dropIfExists('media_assets');
    }
};
