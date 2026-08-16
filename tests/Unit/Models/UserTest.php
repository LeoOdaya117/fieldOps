<?php

namespace Tests\Unit\Models;

use App\Models\User;
use Tests\TestCase;

class UserTest extends TestCase
{
    public function test_sensitive_user_attributes_are_hidden_from_serialization(): void
    {
        $user = User::factory()->make([
            'password' => 'secret-password',
            'remember_token' => 'remember-token',
            'two_factor_secret' => 'two-factor-secret',
            'two_factor_recovery_codes' => 'recovery-codes',
        ]);

        $serialized = $user->toArray();

        $this->assertArrayNotHasKey('password', $serialized);
        $this->assertArrayNotHasKey('remember_token', $serialized);
        $this->assertArrayNotHasKey('two_factor_secret', $serialized);
        $this->assertArrayNotHasKey('two_factor_recovery_codes', $serialized);
    }
}
