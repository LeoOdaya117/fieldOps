<?php

namespace Database\Seeders;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Creates the three accounts needed to sign in after a fresh installation.
 *
 * Existing accounts are never reset or re-passworded by a repeat seed. This
 * makes the seeder safe to run as part of deployment while still making a
 * clean local installation immediately usable.
 */
class DefaultAccountsSeeder extends Seeder
{
    public function run(): void
    {
        foreach (config('rbac.default_accounts', []) as $account) {
            $user = User::withTrashed()->firstOrNew(['email' => $account['email']]);

            if (! $user->exists) {
                $user->name = $account['name'];
                $user->password = (string) config('rbac.default_account_password', 'password');
                $user->email_verified_at = Carbon::now();
                $user->status = UserStatus::Active;
                $user->save();
                $user->syncRoles($account['role']);

                continue;
            }

            if ($user->trashed()) {
                $user->restore();
            }

            // Do not alter an existing operator's credentials or role choice.
            // Repair only an incomplete account left by an interrupted seed.
            if (! $user->roles()->exists()) {
                $user->syncRoles($account['role']);
            }
        }
    }
}
