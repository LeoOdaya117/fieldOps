<?php

namespace App\Actions\Rbac;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class BulkChangeUserStatus
{
    public function __construct(private readonly ChangeUserStatus $changeStatus) {}

    /**
     * @param  Collection<int, User>  $users
     */
    public function suspend(Collection $users, User $actor): int
    {
        return $this->change($users, $actor, UserStatus::Suspended);
    }

    /**
     * @param  Collection<int, User>  $users
     */
    public function reactivate(Collection $users, User $actor): int
    {
        return $this->change($users, $actor, UserStatus::Active);
    }

    /**
     * @param  Collection<int, User>  $users
     */
    private function change(Collection $users, User $actor, UserStatus $status): int
    {
        $changed = 0;

        DB::transaction(function () use ($users, $actor, $status, &$changed): void {
            foreach ($users as $user) {
                if ($status === UserStatus::Suspended) {
                    $this->changeStatus->suspend($user, $actor);
                } else {
                    $this->changeStatus->reactivate($user, $actor);
                }

                $changed++;
            }
        });

        return $changed;
    }
}
