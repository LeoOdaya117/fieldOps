<?php

namespace App\Actions\Rbac;

use App\Models\User;
use App\Models\UserRegistration;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class SubmitRegistration
{
    /** @param array<string, mixed> $data */
    public function execute(array $data): UserRegistration
    {
        $email = mb_strtolower(trim((string) $data['email']));

        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => 'An account with this email already exists.',
            ]);
        }

        if (UserRegistration::query()->where('email', $email)->where('status', 'pending')->exists()) {
            throw ValidationException::withMessages([
                'email' => 'A registration for this email is already awaiting review.',
            ]);
        }

        return UserRegistration::query()->create([
            'name' => trim((string) $data['name']),
            'email' => $email,
            'password' => Hash::make((string) $data['password']),
        ]);
    }
}
