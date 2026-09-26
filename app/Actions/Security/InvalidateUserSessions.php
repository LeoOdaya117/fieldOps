<?php

namespace App\Actions\Security;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class InvalidateUserSessions
{
    public function execute(User $user): void
    {
        DB::transaction(function () use ($user): void {
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $user->getKey())->delete();
            }

            $user->forceFill([
                'session_version' => (int) $user->session_version + 1,
                'remember_token' => Str::random(60),
            ])->saveQuietly();
        });
    }
}
