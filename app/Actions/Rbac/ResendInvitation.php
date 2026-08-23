<?php

namespace App\Actions\Rbac;

use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ResendInvitation
{
    public function __construct(
        private readonly InviteUser $invite,
        private readonly RecordAccessAudit $audit,
    ) {}

    public function execute(UserInvitation $invitation, User $actor): UserInvitation
    {
        return DB::transaction(function () use ($invitation, $actor): UserInvitation {
            $invitation = UserInvitation::query()->lockForUpdate()->with('role')->whereKey($invitation->getKey())->firstOrFail();

            if ($invitation->accepted_at !== null || $invitation->revoked_at !== null) {
                throw ValidationException::withMessages(['invitation' => 'This invitation cannot be resent.']);
            }

            $invitation->forceFill(['revoked_at' => now()])->save();
            $this->audit->record('invitation.revoked', $actor, $invitation);

            return $this->invite->execute($invitation->email, $invitation->role, $actor)['invitation'];
        });
    }
}
