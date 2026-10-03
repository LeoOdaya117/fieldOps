<?php

namespace App\Actions\Exports;

use App\Actions\DataTables\BuildListingQuery;
use App\Models\AccessAuditEvent;
use App\Models\BlockedIpAddress;
use App\Models\Country;
use App\Models\MediaAsset;
use App\Models\Role;
use App\Models\Timezone;
use App\Models\User;
use App\Models\UserInvitation;
use App\Models\UserRegistration;
use App\Models\VisitLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Provides allow-listed export queries and columns for each listing dataset. */
class ExportDatasetRegistry
{
    public function __construct(private readonly BuildListingQuery $listingQuery) {}

    /** @var list<string> */
    public const array DATASETS = [
        'users', 'invitations', 'registrations', 'roles', 'audit', 'ip-blocks', 'visit-logs', 'files', 'countries', 'timezones',
    ];

    /** @var list<string> */
    public const array FORMATS = ['pdf', 'csv', 'xlsx', 'print'];

    /** @var array<string, string> */
    private const array DATASET_PERMISSION = [
        'users' => 'users', 'invitations' => 'users', 'registrations' => 'users', 'roles' => 'roles', 'audit' => 'audit',
        'ip-blocks' => 'ip_blocks', 'visit-logs' => 'visit_logs', 'countries' => 'countries', 'timezones' => 'timezones',
    ];

    /** @return array<string, string> */
    public function columns(string $dataset): array
    {
        return match ($dataset) {
            'users' => ['id' => 'ID', 'name' => 'Name', 'email' => 'Email', 'position' => 'Position', 'department' => 'Department', 'role' => 'Role', 'status' => 'Status', 'email_verified_at' => 'Email Verified', 'created_at' => 'Created At', 'updated_at' => 'Updated At'],
            'invitations' => ['email' => 'Email', 'role' => 'Role', 'status' => 'Status', 'expires_at' => 'Expires At', 'created_at' => 'Created At', 'updated_at' => 'Updated At'],
            'registrations' => ['name' => 'Name', 'email' => 'Email', 'status' => 'Status', 'created_at' => 'Submitted At', 'updated_at' => 'Updated At'],
            'roles' => ['display_name' => 'Role', 'name' => 'Key', 'description' => 'Description', 'type' => 'Type', 'users_count' => 'Users', 'permissions_count' => 'Permissions', 'status' => 'Status', 'created_at' => 'Created At', 'updated_at' => 'Updated At'],
            'audit' => ['event' => 'Event', 'actor' => 'Actor', 'subject_type' => 'Subject Type', 'subject_id' => 'Subject ID', 'ip_address' => 'IP Address', 'occurred_at' => 'Occurred At'],
            'ip-blocks' => ['ip_address' => 'IP Address', 'user' => 'User', 'reason' => 'Reason', 'is_active' => 'Block Active', 'blocked_at' => 'Blocked At', 'first_seen_at' => 'First Seen', 'last_seen_at' => 'Last Seen', 'unblocked_at' => 'Unblocked At', 'record_status' => 'Record Status'],
            'visit-logs' => ['user' => 'User', 'event_type' => 'Event', 'outcome' => 'Outcome', 'ip_address' => 'IP Address', 'location_country_code' => 'Country', 'location_region' => 'Region', 'location_city' => 'City', 'method' => 'Method', 'route_name' => 'Route', 'path' => 'Path', 'status_code' => 'Status Code', 'occurred_at' => 'Occurred At'],
            'files' => ['original_name' => 'File Name', 'module' => 'Module', 'tag' => 'Tag', 'mime_type' => 'Type', 'extension' => 'Extension', 'size_bytes' => 'Size (bytes)', 'width' => 'Width', 'height' => 'Height', 'uploaded_by' => 'Uploaded By', 'created_at' => 'Uploaded At'],
            'countries' => ['code' => 'Code', 'name' => 'Name', 'record_status' => 'Record Status', 'created_at' => 'Created At', 'updated_at' => 'Updated At'],
            'timezones' => ['name' => 'Timezone', 'record_status' => 'Record Status', 'created_at' => 'Created At', 'updated_at' => 'Updated At'],
            default => throw new \InvalidArgumentException('Unsupported export dataset.'),
        };
    }

    public function permission(string $dataset, string $format): ?string
    {
        if (! in_array($format, self::FORMATS, true)) {
            return null;
        }

        if ($dataset === 'files') {
            return null;
        }

        $namespace = self::DATASET_PERMISSION[$dataset] ?? null;

        return $namespace === null ? null : $namespace.'.export_'.$format;
    }

    public function canExport(User $user, string $dataset, string $format): bool
    {
        if (! $user->isActive() || ! in_array($dataset, self::DATASETS, true) || ! in_array($format, self::FORMATS, true)) {
            return false;
        }

        if ($dataset === 'files') {
            return $user->can('files.view') && $this->eligibleFileScopes($user, $format) !== [];
        }

        $permission = $this->permission($dataset, $format);
        if ($permission === null || ! $user->can($permission)) {
            return false;
        }

        $viewPermissions = [
            'users' => 'users.view',
            'invitations' => 'users.view',
            'registrations' => 'users.review_registrations',
            'roles' => 'roles.view',
            'audit' => 'audit.view',
            'ip-blocks' => 'ip_blocks.view',
            'visit-logs' => 'visit_logs.view',
            'countries' => 'countries.view',
            'timezones' => 'timezones.view',
        ];
        $viewPermission = $viewPermissions[$dataset];

        return $user->can($viewPermission)
            && ($dataset !== 'registrations' || $user->can('users.review_registrations'));
    }

    /** @return array<string, 'all'|'owner'> */
    public function eligibleFileScopes(User $user, string $format, bool $includeDeleted = false): array
    {
        $status = $includeDeleted ? 'inactive' : 'active';
        $visibleScopes = $this->listingQuery->visibleFileScopes($user, $status);
        $permissions = [
            'files' => 'files.export_'.$format,
            'gallery' => 'media_assets.export_'.$format,
            'avatars' => 'users.export_'.$format,
        ];

        return array_filter($visibleScopes, static fn (string $scope, string $module): bool => $user->can($permissions[$module]), ARRAY_FILTER_USE_BOTH);
    }

    /** @param array<string, mixed> $filters
     * @return Builder<User>|Builder<UserInvitation>|Builder<UserRegistration>|Builder<Role>|Builder<AccessAuditEvent>|Builder<BlockedIpAddress>|Builder<VisitLog>|Builder<MediaAsset>|Builder<Country>|Builder<Timezone>
     */
    public function query(string $dataset, User $user, array $filters): Builder
    {
        if ($dataset === 'files' && ! isset($filters['_file_scopes'])) {
            $filters['_file_scopes'] = $this->eligibleFileScopes(
                $user,
                (string) ($filters['_format'] ?? 'csv'),
                ($filters['record_status'] ?? 'active') === 'inactive',
            );
        }

        return $this->listingQuery->query($dataset, $user, $filters);
    }

    /** @param array<string, mixed> $filters
     * @return list<array<string, scalar|null>>
     */
    public function rows(string $dataset, User $user, array $filters): array
    {
        return array_values($this->query($dataset, $user, $filters)->limit(10001)->get()->map(fn (Model $model): array => $this->row($dataset, $model))->all());
    }

    /** @return array<string, scalar|null> */
    private function row(string $dataset, Model $model): array
    {
        $date = static fn (mixed $value): ?string => $value?->format('Y-m-d H:i:s');

        return match ($dataset) {
            'users' => $model instanceof User ? [
                'id' => $model->getKey(), 'name' => $model->name, 'email' => $model->email, 'position' => $model->position, 'department' => $model->department,
                'role' => $model->roles->first()?->display_name, 'status' => $model->status->value, 'email_verified_at' => $date($model->email_verified_at),
                'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at),
            ] : [],
            'invitations' => $model instanceof UserInvitation ? [
                'email' => $model->email, 'role' => $model->role->display_name, 'status' => $model->status, 'expires_at' => $date($model->expires_at),
                'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at),
            ] : [],
            'registrations' => $model instanceof UserRegistration ? [
                'name' => $model->name, 'email' => $model->email, 'status' => $model->status->value, 'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at),
            ] : [],
            'roles' => $model instanceof Role ? [
                'display_name' => $model->display_name, 'name' => $model->name, 'description' => $model->description, 'type' => $model->is_system ? 'System' : 'Custom',
                'users_count' => (int) ($model->users_count ?? 0), 'permissions_count' => (int) ($model->permissions_count ?? 0), 'status' => $model->status,
                'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at),
            ] : [],
            'audit' => $model instanceof AccessAuditEvent ? [
                'event' => $model->event, 'actor' => $model->actor?->name, 'subject_type' => $model->subject_type, 'subject_id' => $model->subject_id,
                'ip_address' => $model->ip_address, 'occurred_at' => $date($model->occurred_at),
            ] : [],
            'ip-blocks' => $model instanceof BlockedIpAddress ? [
                'ip_address' => $model->ip_address, 'user' => $model->user?->email, 'reason' => $model->reason, 'is_active' => $model->is_active ? 'Yes' : 'No',
                'blocked_at' => $date($model->blocked_at), 'first_seen_at' => $date($model->first_seen_at), 'last_seen_at' => $date($model->last_seen_at),
                'unblocked_at' => $date($model->unblocked_at), 'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive',
            ] : [],
            'visit-logs' => $model instanceof VisitLog ? [
                'user' => $model->user?->email, 'event_type' => $model->event_type, 'outcome' => $model->outcome, 'ip_address' => $model->ip_address,
                'location_country_code' => $model->location_country_code, 'location_region' => $model->location_region, 'location_city' => $model->location_city,
                'method' => $model->method, 'route_name' => $model->route_name, 'path' => $model->path, 'status_code' => $model->status_code, 'occurred_at' => $date($model->occurred_at),
            ] : [],
            'files' => $model instanceof MediaAsset ? [
                'original_name' => $model->original_name, 'module' => $model->module, 'tag' => $model->tag, 'mime_type' => $model->mime_type, 'extension' => $model->extension,
                'size_bytes' => $model->size_bytes, 'width' => $model->width, 'height' => $model->height, 'uploaded_by' => $model->uploader?->email, 'created_at' => $date($model->created_at),
            ] : [],
            'countries' => $model instanceof Country ? ['code' => $model->code, 'name' => $model->name, 'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive', 'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at)] : [],
            'timezones' => $model instanceof Timezone ? ['name' => $model->name, 'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive', 'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at)] : [],
            default => [],
        };
    }
}
