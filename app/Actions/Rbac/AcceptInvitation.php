<?php

namespace App\Actions\Rbac;

use App\Enums\UserStatus;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AcceptInvitation
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(UserInvitation $invitation, string $name, string $password): User
    {
        return DB::transaction(function () use ($invitation, $name, $password): User {
            $invitation = UserInvitation::query()->lockForUpdate()->with('role')->whereKey($invitation->getKey())->firstOrFail();

            if (! $invitation->isUsable()) {
                throw ValidationException::withMessages(['token' => 'This invitation is no longer valid.']);
            }

            if (User::query()->where('email', $invitation->email)->exists()) {
                throw ValidationException::withMessages(['email' => 'A user with this email already exists.']);
            }

            $user = User::query()->create([
                'name' => $name,
                'email' => $invitation->email,
                'password' => $password,
                'email_verified_at' => now(),
                'status' => UserStatus::Active,
            ]);
            $user->syncRoles([$invitation->role]);
            $invitation->forceFill(['accepted_at' => now()])->save();

            $this->audit->record(
                'invitation.accepted',
                null,
                $user,
                null,
                ['role' => $invitation->role->name],
            );

            return $user;
        });
    }
}
