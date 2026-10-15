<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blocked_ip_addresses', static function (Blueprint $table): void {
            $table->id();
            $table->string('ip_address', 45)->unique();
            $table->string('reason')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('blocked_at');
            $table->foreignId('blocked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('unblocked_at')->nullable();
            $table->foreignId('unblocked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['is_active', 'ip_address']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_ip_addresses');
    }
};
