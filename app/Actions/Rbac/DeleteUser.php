<?php

namespace App\Actions\Rbac;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class DeleteUser
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(User $target, User $actor): void
    {
        DB::transaction(function () use ($target, $actor): void {
            $target = User::query()->lockForUpdate()->whereKey($target->getKey())->firstOrFail();

            if ($target->is($actor)) {
                throw ValidationException::withMessages([
                    'user' => 'You cannot delete your own account.',
                ]);
            }

            if ($target->isOwner()) {
                $remainingOwners = User::query()
                    ->where('status', UserStatus::Active->value)
                    ->where('users.id', '<>', $target->getKey())
                    ->role(RoleName::ownerRoleNames())
                    ->lockForUpdate()
                    ->count();

                if ($remainingOwners < 1) {
                    throw ValidationException::withMessages([
                        'user' => 'The enterprise must retain at least one active Owner.',
                    ]);
                }
            }

            $before = [
                'name' => $target->name,
                'email' => $target->email,
                'status' => $target->status->value,
                'record_status' => (int) $target->record_status,
            ];

            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $target->getKey())->delete();
            }

            $target->delete();

            $this->audit->record('user.deleted', $actor, $target, $before, null);
        });
    }
}
