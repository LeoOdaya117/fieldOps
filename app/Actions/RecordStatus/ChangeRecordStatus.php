<?php

namespace App\Actions\RecordStatus;

use App\Actions\Rbac\AssertRoleCanBeRemoved;
use App\Actions\Rbac\RecordAccessAudit;
use App\Actions\Security\InvalidateUserSessions;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\BlockedIpAddress;
use App\Models\Country;
use App\Models\MediaAsset;
use App\Models\OrganizationLocation;
use App\Models\Role;
use App\Models\Timezone;
use App\Models\User;
use App\Models\UserInvitation;
use App\Support\SystemSettings;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChangeRecordStatus
{
    public function __construct(
        private readonly RecordAccessAudit $audit,
        private readonly InvalidateUserSessions $invalidateSessions,
        private readonly AssertRoleCanBeRemoved $assertRoleCanBeRemoved,
    ) {}

    /** @param class-string<User|UserInvitation|Role|Country|Timezone|BlockedIpAddress|OrganizationLocation|MediaAsset> $modelClass */
    public function execute(string $modelClass, int|string $id, int $status, User $actor): void
    {
        DB::transaction(function () use ($modelClass, $id, $status, $actor): void {
            /** @var User|UserInvitation|Role|Country|Timezone|BlockedIpAddress|OrganizationLocation|MediaAsset $record */
            $record = $modelClass::query()->withoutGlobalScope('record_status')->lockForUpdate()->findOrFail($id);

            if ($record instanceof MediaAsset && (int) $record->uploader_id !== (int) $actor->getKey()) {
                throw new AuthorizationException;
            }

            if ((int) $record->record_status === $status) {
                return;
            }

            $this->assertCanDeactivate($record, $actor, $status);

            $before = ['record_status' => (int) $record->record_status];
            $attributes = ['record_status' => $status, 'updated_by' => $actor->getKey()];
            if ($record instanceof User && $status === 0) {
                $this->invalidateSessions->execute($record);
            }

            $record->forceFill($attributes)->saveQuietly();
            $this->audit->record(
                $this->eventPrefix($record).'.'.($status === 1 ? 'activated' : 'deactivated'),
                $actor,
                $record,
                $before,
                ['record_status' => $status],
            );
        });
    }

    private function assertCanDeactivate(Model $record, User $actor, int $status): void
    {
        if ($record instanceof User && $record->isSuperAdmin() && ! $actor->isSuperAdmin()) {
            throw ValidationException::withMessages(['record_status' => 'Only a Super Admin can change the record status of a Super Admin account.']);
        }

        if ($status !== 0) {
            return;
        }

        if ($record instanceof User) {
            if ($record->is($actor)) {
                throw ValidationException::withMessages(['record_status' => 'You cannot deactivate your own account.']);
            }

            if ($record->isSuperAdmin()) {
                $remainingSuperAdmins = User::query()
                    ->where('status', UserStatus::Active->value)
                    ->whereKeyNot($record->getKey())
                    ->role(RoleName::elevatedRoleNames())
                    ->lockForUpdate()
                    ->count();

                if ($remainingSuperAdmins < 1) {
                    throw ValidationException::withMessages(['record_status' => 'The enterprise must retain at least one active Super Admin.']);
                }
            }
        }

        if ($record instanceof Role) {
            if ($record->is_system && ! $actor->isSuperAdmin()) {
                throw ValidationException::withMessages(['record_status' => 'System roles cannot be deactivated.']);
            }

            $this->assertRoleCanBeRemoved->execute($record, 'record_status', 'deactivated');
        }

        if ($record instanceof Timezone) {
            if ($record->name === SystemSettings::timezone()) {
                throw ValidationException::withMessages(['record_status' => 'The current system timezone cannot be deactivated. Choose another system timezone first.']);
            }

            if (Timezone::query()->count() <= 1) {
                throw ValidationException::withMessages(['record_status' => 'At least one timezone must remain available.']);
            }
        }

        if ($record instanceof MediaAsset && $record->isAssigned()) {
            throw ValidationException::withMessages([
                'record_status' => 'This image is assigned to a platform slot. Reset or replace that slot before deactivating it.',
            ]);
        }
    }

    private function eventPrefix(Model $record): string
    {
        return match (true) {
            $record instanceof User => 'user',
            $record instanceof UserInvitation => 'user_invitation',
            $record instanceof Role => 'role',
            $record instanceof BlockedIpAddress => 'ip_block',
            $record instanceof Country => 'country',
            $record instanceof Timezone => 'timezone',
            $record instanceof OrganizationLocation => 'organization_location',
            $record instanceof MediaAsset => 'media.asset',
            default => 'record',
        };
    }
}
