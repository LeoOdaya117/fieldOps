<?php

namespace App\Actions\Rbac;

use App\Actions\Security\InvalidateUserSessions;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChangeUserStatus
{
    public function __construct(
        private readonly RecordAccessAudit $audit,
        private readonly InvalidateUserSessions $invalidateSessions,
    ) {}

    public function suspend(User $target, User $actor): void
    {
        $this->change($target, $actor, UserStatus::Suspended);
    }

    public function reactivate(User $target, User $actor): void
    {
        $this->change($target, $actor, UserStatus::Active);
    }

    private function change(User $target, User $actor, UserStatus $status): void
    {
        DB::transaction(function () use ($target, $actor, $status): void {
            $target = User::query()->lockForUpdate()->whereKey($target->getKey())->firstOrFail();

            if ($target->is($actor)) {
                throw ValidationException::withMessages(['status' => 'You cannot suspend or reactivate your own account.']);
            }

            if ($target->status === $status) {
                return;
            }

            if ($status === UserStatus::Suspended && $target->isSuperAdmin()) {
                if (! $actor->isSuperAdmin()) {
                    throw ValidationException::withMessages(['status' => 'Only a Super Admin can suspend a Super Admin.']);
                }

                $remainingSuperAdmins = User::query()
                    ->where('status', UserStatus::Active->value)
                    ->where('users.id', '<>', $target->getKey())
                    ->role(RoleName::elevatedRoleNames())
                    ->lockForUpdate()
                    ->count();

                if ($remainingSuperAdmins < 1) {
                    throw ValidationException::withMessages(['status' => 'The enterprise must retain at least one active Super Admin.']);
                }
            }

            $before = ['status' => $target->status->value];
            if ($status === UserStatus::Suspended) {
                $this->invalidateSessions->execute($target);
            }

            $target->status = $status;
            $target->suspended_at = $status === UserStatus::Suspended ? now() : null;
            $target->suspended_by = $status === UserStatus::Suspended ? $actor->getKey() : null;
            $target->save();

            $this->audit->record(
                'user.'.($status === UserStatus::Suspended ? 'suspended' : 'reactivated'),
                $actor,
                $target,
                $before,
                ['status' => $status->value],
            );
        });
    }
}
