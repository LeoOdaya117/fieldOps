<?php

namespace App\Actions\Rbac;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class ChangeUserStatus
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

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

            if ($status === UserStatus::Suspended && $target->isOwner()) {
                $remainingOwners = User::query()
                    ->where('status', UserStatus::Active->value)
                    ->where('users.id', '<>', $target->getKey())
                    ->role(RoleName::ownerRoleNames())
                    ->lockForUpdate()
                    ->count();

                if ($remainingOwners < 1) {
                    throw ValidationException::withMessages(['status' => 'The enterprise must retain at least one active Owner.']);
                }
            }

            $before = ['status' => $target->status->value];
            $target->status = $status;
            $target->suspended_at = $status === UserStatus::Suspended ? now() : null;
            $target->suspended_by = $status === UserStatus::Suspended ? $actor->getKey() : null;
            $target->save();

            if ($status === UserStatus::Suspended && Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $target->getKey())->delete();
            }

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
