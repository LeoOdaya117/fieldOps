<?php

namespace Tests\Fixtures;

use App\Models\User;
use App\Notifications\AccessNotification;
use Database\Seeders\DefaultAccountsSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Database\Seeder;

class NotificationBrowserSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('testing')) {
            throw new \RuntimeException('Notification browser fixtures require the testing environment.');
        }
        $this->call([RbacSeeder::class, DefaultAccountsSeeder::class]);
        $owner = User::query()->where('email', 'superadmin@example.com')->firstOrFail();
        for ($i = 1; $i <= 25; $i++) {
            $owner->notify(new AccessNotification('user.role_changed', 'Your role has changed', 'Test update '.$i.': Your role changed from Technician to Dispatcher.'));
        }
    }
}
