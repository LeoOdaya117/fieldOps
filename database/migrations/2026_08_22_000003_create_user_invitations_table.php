<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_invitations', static function (Blueprint $table): void {
            $table->id();
            $table->string('email');
            $table->foreignId('role_id')->constrained('roles')->restrictOnDelete();
            $table->foreignId('invited_by')->constrained('users')->restrictOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
            $table->index(['email', 'accepted_at', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_invitations');
    }
};
