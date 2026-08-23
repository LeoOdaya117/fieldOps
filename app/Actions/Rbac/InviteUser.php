<?php

namespace App\Actions\Rbac;

use App\Models\Role;
use App\Models\User;
use App\Models\UserInvitation;
use App\Notifications\UserInvitationNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InviteUser
{
    public function __construct(
        private readonly RecordAccessAudit $audit,
        private readonly ValidateRoleGrant $validateRoleGrant,
    ) {}

    /** @return array{invitation: UserInvitation, token: string} */
    public function execute(string $email, Role $role, User $actor): array
    {
        $email = mb_strtolower(trim($email));

        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => 'A user with this email already exists.']);
        }

        if (UserInvitation::query()
            ->where('email', $email)
            ->whereNull('accepted_at')
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->exists()) {
            throw ValidationException::withMessages(['email' => 'An active invitation already exists for this email.']);
        }

        $this->validateRoleGrant->execute($actor, $role);

        return DB::transaction(function () use ($email, $role, $actor): array {
            $token = UserInvitation::generateToken();
            $invitation = UserInvitation::query()->create([
                'email' => $email,
                'role_id' => $role->getKey(),
                'invited_by' => $actor->getKey(),
                'token_hash' => UserInvitation::hashToken($token),
                'expires_at' => now()->addDays(7),
            ]);

            $this->audit->record(
                'invitation.created',
                $actor,
                $invitation,
                null,
                ['email' => $email, 'role' => $role->name, 'expires_at' => $invitation->expires_at->toIso8601String()],
            );

            $invitation->notify(new UserInvitationNotification($token));

            return compact('invitation', 'token');
        });
    }
}
