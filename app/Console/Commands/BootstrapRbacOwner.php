<?php

namespace App\Console\Commands;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BootstrapRbacOwner extends Command
{
    protected $signature = 'rbac:bootstrap-owner {email : Verified user email to make the initial Owner}';

    protected $description = 'Assign the initial Owner role to one verified active user.';

    public function handle(): int
    {
        $user = User::query()->where('email', mb_strtolower($this->argument('email')))->first();

        if ($user === null || $user->status !== UserStatus::Active || $user->email_verified_at === null) {
            $this->error('The user must exist, be active, and have a verified email address.');

            return self::FAILURE;
        }

        if (User::query()->where('status', UserStatus::Active->value)->role(RoleName::ownerRoleNames())->exists()) {
            $this->error('An active owner-level administrator already exists.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($user): void {
            $role = Role::query()->where('name', RoleName::Owner->value)->where('guard_name', 'web')->firstOrFail();
            $user->syncRoles([$role]);
        });

        $this->info("{$user->email} is now the initial Owner.");

        return self::SUCCESS;
    }
}
