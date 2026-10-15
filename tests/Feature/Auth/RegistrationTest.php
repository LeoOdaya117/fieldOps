<?php

namespace Tests\Feature\Auth;

use App\Models\UserRegistration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get(route('register'));

        $response->assertOk();
    }

    public function test_new_registrations_are_queued_without_authenticating_the_applicant(): void
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertRedirect(route('register'));
        $this->assertGuest();
        $this->assertDatabaseHas('user_registrations', [
            'email' => 'test@example.com',
            'status' => 'pending',
        ]);
        $this->assertDatabaseMissing('users', ['email' => 'test@example.com']);
    }

    public function test_duplicate_pending_registrations_are_rejected(): void
    {
        UserRegistration::query()->create([
            'name' => 'Existing applicant',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);

        $this->from(route('register'))
            ->post(route('register.store'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'password' => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertRedirect(route('register'))
            ->assertSessionHasErrors('email');
    }
}
