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
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use IntlDateFormatter;
use IntlDatePatternGenerator;

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

    /** @var list<string> */
    private const array NUMBERED_DATASETS = ['users', 'invitations', 'roles', 'audit', 'ip-blocks', 'visit-logs', 'countries', 'timezones'];

    public function hasSerialColumn(string $dataset): bool
    {
        return in_array($dataset, self::NUMBERED_DATASETS, true);
    }

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

    /** UI table keys allowed in PDF and Print, mapped to safe report row keys and labels.
     * @return array<string, array{key: string, label: string}>
     */
    public function reportColumnMap(string $dataset): array
    {
        $defaults = [
            'created_at' => ['key' => 'created_at', 'label' => 'Created'],
            'updated_at' => ['key' => 'updated_at', 'label' => 'Updated'],
            'created_by' => ['key' => 'created_by', 'label' => 'Created by'],
            'updated_by' => ['key' => 'updated_by', 'label' => 'Updated by'],
            'record_status' => ['key' => 'record_status', 'label' => 'Record status'],
        ];

        return match ($dataset) {
            'users' => [
                'user' => ['key' => 'user', 'label' => 'User'], 'status' => ['key' => 'status', 'label' => 'Status'],
                'role' => ['key' => 'role', 'label' => 'Role'], 'created' => ['key' => 'created_at', 'label' => 'Created'],
                'updated_at' => $defaults['updated_at'], 'created_by' => $defaults['created_by'],
                'updated_by' => $defaults['updated_by'], 'record_status' => $defaults['record_status'],
            ],
            'invitations' => [
                'email' => ['key' => 'email', 'label' => 'Email'], 'role' => ['key' => 'role', 'label' => 'Role'],
                'expires' => ['key' => 'expires_at', 'label' => 'Expires'], 'status' => ['key' => 'status', 'label' => 'Status'],
                ...$defaults,
            ],
            'registrations' => [
                'applicant' => ['key' => 'applicant', 'label' => 'Applicant'], 'status' => ['key' => 'status', 'label' => 'Status'],
                'created_at' => $defaults['created_at'], 'updated_at' => $defaults['updated_at'],
            ],
            'roles' => [
                'role' => ['key' => 'role_summary', 'label' => 'Role'], 'type' => ['key' => 'type_display', 'label' => 'Type'],
                'assigned' => ['key' => 'users_count', 'label' => 'Assigned users'],
                'permissions' => ['key' => 'permissions_display', 'label' => 'Permissions'],
                'status' => ['key' => 'status', 'label' => 'Status'], ...$defaults,
            ],
            'audit' => [
                'event' => ['key' => 'event', 'label' => 'Event'], 'actor' => ['key' => 'actor', 'label' => 'Actor'],
                'subject' => ['key' => 'subject', 'label' => 'Subject'], 'ip_address' => ['key' => 'ip_address', 'label' => 'Source IP'],
                'occurred' => ['key' => 'occurred_at', 'label' => 'Occurred'], 'changes' => ['key' => 'changes', 'label' => 'Changed fields'],
            ],
            'ip-blocks' => [
                'ip_address' => ['key' => 'ip_address', 'label' => 'IP address'], 'status' => ['key' => 'block_status', 'label' => 'Status'],
                'user' => ['key' => 'user_display', 'label' => 'Observed user'], 'reason' => ['key' => 'reason_display', 'label' => 'Reason'],
                'last_seen_at' => ['key' => 'last_seen_at', 'label' => 'Last seen'], ...$defaults,
            ],
            'visit-logs' => [
                'occurred_at' => ['key' => 'occurred_at', 'label' => 'Occurred'], 'ip_address' => ['key' => 'ip_address', 'label' => 'IP address'],
                'location' => ['key' => 'location', 'label' => 'Location'], 'user' => ['key' => 'user_display', 'label' => 'User'],
                'event' => ['key' => 'event', 'label' => 'Event'], 'request' => ['key' => 'request', 'label' => 'Request'],
                'status' => ['key' => 'status_code', 'label' => 'Status'], 'user_agent' => ['key' => 'user_agent', 'label' => 'User agent'],
            ],
            'files' => [
                'name' => ['key' => 'original_name', 'label' => 'Name'], 'type' => ['key' => 'type_display', 'label' => 'Type'],
                'size' => ['key' => 'size_display', 'label' => 'Size'], 'dimensions' => ['key' => 'dimensions', 'label' => 'Dimensions'],
                'module' => ['key' => 'module', 'label' => 'Module'], 'tag' => ['key' => 'tag', 'label' => 'Tag'],
                'created_at' => ['key' => 'created_at', 'label' => 'Uploaded'], 'record_status' => $defaults['record_status'],
            ],
            'countries' => [
                'code' => ['key' => 'code', 'label' => 'Country code'], 'name' => ['key' => 'name', 'label' => 'Name'], ...$defaults,
            ],
            'timezones' => ['name' => ['key' => 'name', 'label' => 'Timezone'], ...$defaults],
            default => throw new \InvalidArgumentException('Unsupported export dataset.'),
        };
    }

    /** @param list<string> $selected
     * @return array<string, string>
     */
    public function reportColumns(string $dataset, array $selected): array
    {
        $map = $this->reportColumnMap($dataset);
        if ($selected === [] || count($selected) > count($map) || count($selected) !== count(array_unique($selected))) {
            throw new \InvalidArgumentException('Invalid report columns.');
        }
        $columns = $this->hasSerialColumn($dataset) ? ['serial' => '#'] : [];
        foreach ($selected as $key) {
            $column = $map[$key] ?? throw new \InvalidArgumentException('Unsupported report column.');
            $columns[$column['key']] = $column['label'];
        }
        if (count($columns) !== count($selected) + ($this->hasSerialColumn($dataset) ? 1 : 0)) {
            throw new \InvalidArgumentException('Duplicate report columns.');
        }

        return $columns;
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
        $query = $this->query($dataset, $user, $filters);
        if (in_array($dataset, ['users', 'invitations', 'roles', 'ip-blocks', 'countries', 'timezones'], true)) {
            $query->with(['createdBy:id,name', 'updatedBy:id,name']);
        }

        $reportTimezone = $filters['_report_timezone'] ?? null;
        $reportLocale = $filters['_report_locale'] ?? null;
        $isReport = is_string($reportTimezone) && is_string($reportLocale);
        $formatters = [];
        $date = static function (mixed $value, string $style = 'medium') use ($reportTimezone, $reportLocale, &$formatters): ?string {
            if (! $value instanceof DateTimeInterface) {
                return null;
            }
            if (! is_string($reportTimezone) || ! is_string($reportLocale)) {
                return $value->format('Y-m-d H:i:s');
            }

            if (! isset($formatters[$style])) {
                $pattern = match ($style) {
                    'date' => IntlDatePatternGenerator::create($reportLocale)->getBestPattern('yMd'),
                    'full' => IntlDatePatternGenerator::create($reportLocale)->getBestPattern('yMdjms'),
                    default => null,
                };
                if ($pattern === false) {
                    throw new \RuntimeException('The report date pattern could not be created.');
                }
                $formatters[$style] = new IntlDateFormatter(
                    $reportLocale,
                    $style === 'medium' ? IntlDateFormatter::MEDIUM : IntlDateFormatter::NONE,
                    $style === 'medium' ? IntlDateFormatter::SHORT : IntlDateFormatter::NONE,
                    $reportTimezone,
                    null,
                    $pattern,
                );
            }

            $formatted = $formatters[$style]->format($value);

            return is_string($formatted) ? str_replace("\u{202F}", ' ', $formatted) : null;
        };

        $canManageSystemRoles = $user->isSuperAdmin();

        return array_values($query->limit(10001)->get()->map(function (Model $model, int $index) use ($dataset, $date, $isReport, $canManageSystemRoles): array {
            $row = $this->row($dataset, $model, $date, $isReport, $canManageSystemRoles);
            if ($this->hasSerialColumn($dataset)) {
                $row['serial'] = $index + 1;
            }

            return $row;
        })->all());
    }

    /** @param \Closure(mixed, string=): ?string $date
     * @return array<string, scalar|null>
     */
    private function row(string $dataset, Model $model, \Closure $date, bool $isReport, bool $canManageSystemRoles): array
    {
        return match ($dataset) {
            'users' => $model instanceof User ? [
                'id' => $model->getKey(), 'name' => $model->name, 'email' => $model->email, 'position' => $model->position, 'department' => $model->department,
                'role' => $model->roles->first()?->display_name, 'status' => $model->status->value, 'email_verified_at' => $date($model->email_verified_at),
                'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at),
                'user' => $model->name.' ('.$model->email.')', 'created_by' => $model->createdBy?->name, 'updated_by' => $model->updatedBy?->name,
                'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive',
            ] : [],
            'invitations' => $model instanceof UserInvitation ? [
                'email' => $model->email, 'role' => $model->role->display_name, 'status' => $model->status, 'expires_at' => $date($model->expires_at, 'date'),
                'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at),
                'created_by' => $model->createdBy?->name, 'updated_by' => $model->updatedBy?->name,
                'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive',
            ] : [],
            'registrations' => $model instanceof UserRegistration ? [
                'name' => $model->name, 'email' => $model->email, 'status' => $model->status->value, 'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at),
                'applicant' => $model->name.' ('.$model->email.')',
            ] : [],
            'roles' => $model instanceof Role ? [
                'display_name' => $model->display_name, 'name' => $model->name, 'description' => $model->description, 'type' => $model->is_system ? 'System' : 'Custom',
                'users_count' => (int) ($model->users_count ?? 0), 'permissions_count' => (int) ($model->permissions_count ?? 0), 'status' => $model->status,
                'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at),
                'role_summary' => $model->display_name.' ('.$model->name.')'.($model->description ? ' - '.$model->description : ''),
                'type_display' => $model->is_system ? ($canManageSystemRoles ? 'System' : 'Protected') : 'Custom',
                'permissions_display' => (int) ($model->permissions_count ?? 0) === 0 ? 'Managed' : (int) $model->permissions_count,
                'created_by' => $model->createdBy?->name, 'updated_by' => $model->updatedBy?->name,
                'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive',
            ] : [],
            'audit' => $model instanceof AccessAuditEvent ? [
                'event' => $model->event, 'actor' => $model->actor?->name, 'subject_type' => $model->subject_type, 'subject_id' => $model->subject_id,
                'ip_address' => $model->ip_address, 'occurred_at' => $date($model->occurred_at, 'full'),
                'subject' => $model->subject_type === null ? null : $model->subject_type.' #'.$model->subject_id,
                'changes' => $this->auditChangedFields($model),
            ] : [],
            'ip-blocks' => $model instanceof BlockedIpAddress ? [
                'ip_address' => $model->ip_address, 'user' => $model->user?->email, 'reason' => $model->reason, 'is_active' => $model->is_active ? 'Yes' : 'No',
                'blocked_at' => $date($model->blocked_at), 'first_seen_at' => $date($model->first_seen_at), 'last_seen_at' => $date($isReport ? ($model->last_seen_at ?? $model->first_seen_at) : $model->last_seen_at, 'full'),
                'unblocked_at' => $date($model->unblocked_at), 'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive',
                'created_by' => $model->createdBy?->name, 'updated_by' => $model->updatedBy?->name,
                'block_status' => $model->is_active ? 'Blocked' : 'Allowed',
                'user_display' => $model->user ? $model->user->name.' ('.$model->user->email.')' : 'No user recorded',
                'reason_display' => $model->reason ?? 'No reason provided.',
            ] : [],
            'visit-logs' => $model instanceof VisitLog ? [
                'user' => $model->user?->email, 'event_type' => $model->event_type, 'outcome' => $model->outcome, 'ip_address' => $model->ip_address,
                'location_country_code' => $model->location_country_code, 'location_region' => $model->location_region, 'location_city' => $model->location_city,
                'method' => $model->method, 'route_name' => $model->route_name, 'path' => $model->path, 'status_code' => $model->status_code, 'occurred_at' => $date($model->occurred_at, 'full'),
                'location' => $this->visitLocation($model),
                'event' => $model->event_type.($model->outcome ? ' ('.$model->outcome.')' : ''),
                'request' => $model->method.' '.($model->route_name ?: 'Unmatched route').' '.$model->path,
                'user_display' => $model->user ? $model->user->name.' ('.$model->user->email.')' : 'Anonymous',
                'user_agent' => $model->user_agent,
            ] : [],
            'files' => $model instanceof MediaAsset ? [
                'original_name' => $model->original_name, 'module' => $model->module, 'tag' => $model->tag, 'mime_type' => $model->mime_type, 'extension' => $model->extension,
                'size_bytes' => $model->size_bytes, 'width' => $model->width, 'height' => $model->height, 'uploaded_by' => $model->uploader?->email, 'created_at' => $date($model->created_at),
                'type_display' => strtoupper($model->extension),
                'size_display' => $this->fileSize($model->size_bytes),
                'dimensions' => $model->width && $model->height ? $model->width.' x '.$model->height.' px' : null,
                'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive',
            ] : [],
            'countries' => $model instanceof Country ? ['code' => $model->code, 'name' => $model->name, 'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive', 'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at), 'created_by' => $model->createdBy?->name, 'updated_by' => $model->updatedBy?->name] : [],
            'timezones' => $model instanceof Timezone ? ['name' => $model->name, 'record_status' => $model->record_status === 1 ? 'Active' : 'Inactive', 'created_at' => $date($model->created_at), 'updated_at' => $date($model->updated_at), 'created_by' => $model->createdBy?->name, 'updated_by' => $model->updatedBy?->name] : [],
            default => [],
        };
    }

    private function auditChangedFields(AccessAuditEvent $event): ?string
    {
        $keys = array_unique(array_merge(array_keys($event->before ?? []), array_keys($event->after ?? [])));
        $keys = array_values(array_filter($keys, static fn (string $key): bool => preg_match('/^[a-zA-Z_][a-zA-Z0-9_]{0,39}$/D', $key) === 1));

        return $keys === [] ? null : implode(', ', array_slice($keys, 0, 8)).(count($keys) > 8 ? ', ...' : '');
    }

    private function visitLocation(VisitLog $log): string
    {
        $place = implode(', ', array_filter([$log->location_city, $log->location_region, $log->location_country_code]));
        $coordinates = $log->location_latitude !== null && $log->location_longitude !== null
            ? sprintf('%.5f, %.5f', $log->location_latitude, $log->location_longitude)
            : null;
        $source = $log->location_source === 'browser'
            ? 'Browser location'.($log->location_accuracy_meters !== null ? ' ±'.round($log->location_accuracy_meters).' m' : '')
            : 'Location unavailable';

        return ($place !== '' ? $place : ($coordinates ?? 'Not available'))
            .'; '.($coordinates ?? 'Coordinates unavailable').'; '.$source;
    }

    private function fileSize(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }
        $power = min((int) floor(log($bytes, 1024)), 3);

        return number_format($bytes / (1024 ** $power), 1).' '.['KB', 'MB', 'GB'][$power - 1];
    }
}
