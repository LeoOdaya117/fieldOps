<?php

namespace Tests\Feature\Access;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DefaultAccountsSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_creates_the_three_first_setup_accounts(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseHas('roles', ['name' => 'user']);
        $this->assertDatabaseHas('roles', ['name' => 'admin']);
        $this->assertDatabaseHas('roles', ['name' => 'super_admin']);

        foreach ([
            'user@example.com' => 'user',
            'admin@example.com' => 'admin',
            'superadmin@example.com' => 'super_admin',
        ] as $email => $role) {
            $user = User::query()->where('email', $email)->firstOrFail();

            $this->assertTrue($user->email_verified_at !== null);
            $this->assertTrue($user->isActive());
            $this->assertTrue($user->hasRole($role));
            $this->assertTrue(Hash::check('password', $user->password));
        }
    }

    public function test_reseeding_does_not_reset_existing_default_account_credentials_or_role(): void
    {
        $this->seed(DatabaseSeeder::class);
        $account = User::query()->where('email', 'admin@example.com')->firstOrFail();
        $account->forceFill(['password' => 'changed-password'])->save();
        $account->syncRoles('user');

        $this->seed(DatabaseSeeder::class);

        $account->refresh();
        $this->assertTrue(Hash::check('changed-password', $account->password));
        $this->assertTrue($account->hasRole('user'));
        $this->assertFalse($account->hasRole('admin'));
    }
}
