<?php

namespace App\Actions\DataTables;

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
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Builds the filtered Eloquent queries shared by table listings and exports.
 *
 * @phpstan-type ListingQueryBuilder Builder<User>|Builder<UserInvitation>|Builder<UserRegistration>|Builder<Role>|Builder<AccessAuditEvent>|Builder<BlockedIpAddress>|Builder<VisitLog>|Builder<MediaAsset>|Builder<Country>|Builder<Timezone>
 */
class BuildListingQuery
{
    /** @param array<string, mixed> $filters
     * @return ListingQueryBuilder
     */
    public function query(string $dataset, User $user, array $filters): Builder
    {
        return match ($dataset) {
            'users' => $this->users($user, $filters),
            'invitations' => $this->invitations($user, $filters),
            'registrations' => $this->registrations($filters),
            'roles' => $this->roles($user, $filters),
            'audit' => $this->audit($filters),
            'ip-blocks' => $this->ipBlocks($user, $filters),
            'visit-logs' => $this->visitLogs($filters),
            'files' => $this->files($user, $filters),
            'countries' => $this->countries($user, $filters),
            'timezones' => $this->timezones($user, $filters),
            default => throw new \InvalidArgumentException('Unsupported export dataset.'),
        };
    }

    /** @param array<string, mixed> $filters
     * @return Builder<User>
     */
    private function users(User $user, array $filters): Builder
    {
        $canDeleted = $user->can('users.view_deleted');
        $statuses = $this->values($filters['record_status'] ?? ['active'], ['active', 'inactive']);
        if (! $canDeleted) {
            $statuses = ['active'];
        }
        $sort = (string) ($filters['sort'] ?? '');
        $direction = $this->direction($filters['direction'] ?? null, 'asc');
        $sortColumns = ['name' => 'name', 'status' => 'status', 'created_at' => 'created_at', 'updated_at' => 'updated_at', 'record_status' => 'record_status'];

        return ($canDeleted ? User::withTrashed() : User::query())
            ->with(['roles:id,name,display_name,is_system'])
            ->when(trim((string) ($filters['search'] ?? '')) !== '', static fn ($query) => $query->where(static function ($query) use ($filters): void {
                $search = trim((string) $filters['search']);
                $query->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            }))
            ->when(($statuses ?: ['active']) !== ['active', 'inactive'], static fn ($query) => $query->whereIn('record_status', array_map(static fn (string $value): int => $value === 'active' ? 1 : 0, $statuses ?: ['active'])))
            ->when(($status = $this->values($filters['status'] ?? [], ['active', 'suspended'])) !== [], static fn ($query) => $query->whereIn('status', $status))
            ->when(($from = $this->date($filters['from'] ?? null)) !== null, static fn ($query) => $query->where('created_at', '>=', $from->startOfDay()))
            ->when(($to = $this->date($filters['to'] ?? null)) !== null, static fn ($query) => $query->where('created_at', '<=', $to->endOfDay()))
            ->when($sort === 'created_by', static fn ($query) => $query->orderBy(DB::table('users as created_actors')->select('created_actors.name')->whereColumn('created_actors.id', 'users.created_by'), $direction))
            ->when($sort === 'updated_by', static fn ($query) => $query->orderBy(DB::table('users as updated_actors')->select('updated_actors.name')->whereColumn('updated_actors.id', 'users.updated_by'), $direction))
            ->when($sort !== 'created_by' && $sort !== 'updated_by', static fn ($query) => $query->when(isset($sortColumns[$sort]), static fn ($query) => $query->orderBy($sortColumns[$sort], $direction), static fn ($query) => $query->orderBy('name')));
    }

    /** @param array<string, mixed> $filters
     * @return Builder<UserInvitation>
     */
    public function invitations(User $user, array $filters): Builder
    {
        $canDeleted = $user->can('users.view_deleted');
        $recordStatuses = $this->values($filters['record_status'] ?? ['active'], ['active', 'inactive']);
        if (! $canDeleted) {
            $recordStatuses = ['active'];
        }
        if ($recordStatuses === []) {
            $recordStatuses = ['active'];
        }
        $sort = (string) ($filters['invitation_sort'] ?? $filters['sort'] ?? '');
        $direction = $this->direction($filters['invitation_direction'] ?? $filters['direction'] ?? null, 'asc');
        $sortColumns = ['status' => 'status', 'created_at' => 'created_at', 'updated_at' => 'updated_at', 'record_status' => 'record_status'];
        $query = $canDeleted ? UserInvitation::withTrashed() : UserInvitation::query();

        return $query->with('role:id,name,display_name')
            ->whereNull('accepted_at')->whereNull('revoked_at')
            ->when($recordStatuses !== ['active', 'inactive'], static fn ($query) => $query->whereIn('record_status', array_map(static fn (string $value): int => $value === 'active' ? 1 : 0, $recordStatuses)))
            ->when($sort === 'created_by', static fn ($query) => $query->orderBy(DB::table('users as created_actors')->select('created_actors.name')->whereColumn('created_actors.id', 'user_invitations.created_by'), $direction))
            ->when($sort === 'updated_by', static fn ($query) => $query->orderBy(DB::table('users as updated_actors')->select('updated_actors.name')->whereColumn('updated_actors.id', 'user_invitations.updated_by'), $direction))
            ->when($sort !== 'created_by' && $sort !== 'updated_by', static fn ($query) => $query->when(isset($sortColumns[$sort]), static fn ($query) => $query->orderBy($sortColumns[$sort], $direction), static fn ($query) => $query->orderByDesc('created_at')));
    }

    /** @param array<string, mixed> $filters
     * @return Builder<UserRegistration>
     */
    public function registrations(array $filters): Builder
    {
        $sort = (string) ($filters['sort'] ?? '');
        $direction = $this->direction($filters['direction'] ?? null, 'asc');

        return UserRegistration::query()->where('status', 'pending')
            ->when(in_array($sort, ['created_at', 'updated_at'], true), static fn ($query) => $query->orderBy($sort, $direction), static fn ($query) => $query->orderByDesc('created_at'));
    }

    /** @param array<string, mixed> $filters
     * @return Builder<Role>
     */
    private function roles(User $user, array $filters): Builder
    {
        $canDeleted = $user->can('roles.view_deleted');
        $statuses = $this->values($filters['record_status'] ?? ['active'], ['active', 'inactive']);
        if (! $canDeleted) {
            $statuses = ['active'];
        }
        $sort = (string) ($filters['sort'] ?? '');
        $direction = $this->direction($filters['direction'] ?? null, 'asc');
        $sortColumns = ['display_name' => 'display_name', 'is_system' => 'is_system', 'users_count' => 'users_count', 'permissions_count' => 'permissions_count', 'status' => 'status', 'created_at' => 'created_at', 'updated_at' => 'updated_at', 'record_status' => 'record_status'];
        $types = $this->values($filters['type'] ?? [], ['system', 'custom']);
        $assigned = $this->values($filters['assigned'] ?? [], ['assigned', 'unassigned']);
        $permissionsMin = trim((string) ($filters['permissions_min'] ?? ''));

        return ($canDeleted ? Role::withTrashed() : Role::query())->withCount(['users', 'permissions'])
            ->when(trim((string) ($filters['search'] ?? '')) !== '', static fn ($query) => $query->where(static function ($query) use ($filters): void {
                $search = trim((string) $filters['search']);
                $query->where('name', 'like', "%{$search}%")->orWhere('display_name', 'like', "%{$search}%")->orWhere('description', 'like', "%{$search}%");
            }))
            ->when(count($types) === 1, static fn ($query) => $query->where('is_system', $types[0] === 'system'))
            ->when(($statuses ?: ['active']) !== ['active', 'inactive'], static fn ($query) => $query->whereIn('record_status', array_map(static fn (string $value): int => $value === 'active' ? 1 : 0, $statuses ?: ['active'])))
            ->when(count($assigned) === 1 && $assigned[0] === 'assigned', static fn ($query) => $query->has('users'))
            ->when(count($assigned) === 1 && $assigned[0] === 'unassigned', static fn ($query) => $query->doesntHave('users'))
            ->when(ctype_digit($permissionsMin), static fn ($query) => $query->has('permissions', '>=', (int) $permissionsMin))
            ->when(($from = $this->date($filters['from'] ?? null)) !== null, static fn ($query) => $query->where('created_at', '>=', $from->startOfDay()))
            ->when(($to = $this->date($filters['to'] ?? null)) !== null, static fn ($query) => $query->where('created_at', '<=', $to->endOfDay()))
            ->when($sort === 'created_by', static fn ($query) => $query->orderBy(DB::table('users as created_actors')->select('created_actors.name')->whereColumn('created_actors.id', 'roles.created_by'), $direction))
            ->when($sort === 'updated_by', static fn ($query) => $query->orderBy(DB::table('users as updated_actors')->select('updated_actors.name')->whereColumn('updated_actors.id', 'roles.updated_by'), $direction))
            ->when($sort !== 'created_by' && $sort !== 'updated_by', static fn ($query) => $query->when(isset($sortColumns[$sort]), static fn ($query) => $query->orderBy($sortColumns[$sort], $direction), static fn ($query) => $query->orderBy('is_system', 'desc')->orderBy('display_name')));
    }

    /** @param array<string, mixed> $filters
     * @return Builder<AccessAuditEvent>
     */
    private function audit(array $filters): Builder
    {
        $eventTypes = AccessAuditEvent::query()->distinct()->orderBy('event')->pluck('event')->all();
        $events = $this->values($filters['event'] ?? [], $eventTypes);
        $actor = trim((string) ($filters['actor'] ?? ''));
        $subject = trim((string) ($filters['subject'] ?? ''));
        $sort = (string) ($filters['sort'] ?? '');
        $direction = $this->direction($filters['direction'] ?? null, 'asc');
        $sortColumns = ['event' => 'event', 'subject_type' => 'subject_type', 'occurred_at' => 'occurred_at'];

        return AccessAuditEvent::query()->with('actor:id,name,email')
            ->when($events !== [], static fn ($query) => $query->whereIn('event', $events))
            ->when($actor !== '', static fn ($query) => $query->whereHas('actor', static fn ($query) => $query->where('name', 'like', "%{$actor}%")->orWhere('email', 'like', "%{$actor}%")))
            ->when($subject !== '', static fn ($query) => $query->where(static fn ($query) => $query->where('subject_type', 'like', "%{$subject}%")->orWhere('subject_id', $subject)))
            ->when(($from = $this->date($filters['from'] ?? null)) !== null, static fn ($query) => $query->where('occurred_at', '>=', $from->startOfDay()))
            ->when(($to = $this->date($filters['to'] ?? null)) !== null, static fn ($query) => $query->where('occurred_at', '<=', $to->endOfDay()))
            ->when($sort === 'actor', static fn ($query) => $query->leftJoin('users', 'access_audit_events.actor_user_id', '=', 'users.id')->select('access_audit_events.*')->orderBy('users.name', $direction))
            ->when($sort !== 'actor', static fn ($query) => $query->when(isset($sortColumns[$sort]), static fn ($query) => $query->orderBy($sortColumns[$sort], $direction), static fn ($query) => $query->latest('occurred_at')));
    }

    /** @param array<string, mixed> $filters
     * @return Builder<BlockedIpAddress>
     */
    private function ipBlocks(User $user, array $filters): Builder
    {
        $canDeleted = $user->can('ip_blocks.view_deleted');
        $recordStatuses = $this->values($filters['record_status'] ?? ['active'], ['active', 'inactive']);
        if (! $canDeleted) {
            $recordStatuses = ['active'];
        }
        $statuses = $this->values($filters['status'] ?? [], ['active', 'inactive']);
        $sort = (string) ($filters['sort'] ?? '');
        $direction = $this->direction($filters['direction'] ?? null, 'asc');
        $sortColumns = ['ip_address' => 'ip_address', 'is_active' => 'is_active', 'blocked_at' => 'blocked_at', 'last_seen_at' => 'last_seen_at', 'created_at' => 'created_at', 'updated_at' => 'updated_at', 'record_status' => 'record_status'];

        return ($canDeleted ? BlockedIpAddress::withTrashed() : BlockedIpAddress::query())->with('user:id,name,email')->with('blockedBy:id,name,email')->with('unblockedBy:id,name,email')
            ->when(trim((string) ($filters['search'] ?? '')) !== '', static fn ($query) => $query->where(static function ($query) use ($filters): void {
                $search = trim((string) $filters['search']);
                $query->where('ip_address', 'like', "%{$search}%")->orWhere('reason', 'like', "%{$search}%")->orWhereHas('user', static fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            }))
            ->when($statuses !== [], static fn ($query) => $query->whereIn('is_active', array_map(static fn (string $status): bool => $status === 'active', $statuses)))
            ->when(($recordStatuses ?: ['active']) !== ['active', 'inactive'], static fn ($query) => $query->whereIn('record_status', array_map(static fn (string $value): int => $value === 'active' ? 1 : 0, $recordStatuses ?: ['active'])))
            ->when(($from = $this->date($filters['from'] ?? null)) !== null, static fn ($query) => $query->where('blocked_at', '>=', $from->startOfDay()))
            ->when(($to = $this->date($filters['to'] ?? null)) !== null, static fn ($query) => $query->where('blocked_at', '<=', $to->endOfDay()))
            ->when($sort === 'created_by', static fn ($query) => $query->orderBy(DB::table('users as created_actors')->select('created_actors.name')->whereColumn('created_actors.id', 'blocked_ip_addresses.created_by'), $direction))
            ->when($sort === 'updated_by', static fn ($query) => $query->orderBy(DB::table('users as updated_actors')->select('updated_actors.name')->whereColumn('updated_actors.id', 'blocked_ip_addresses.updated_by'), $direction))
            ->when($sort !== 'created_by' && $sort !== 'updated_by', static fn ($query) => $query->when(isset($sortColumns[$sort]), static fn ($query) => $query->orderBy($sortColumns[$sort], $direction), static fn ($query) => $query->orderByDesc('is_active')->orderByDesc('last_seen_at')->orderByDesc('blocked_at')));
    }

    /** @param array<string, mixed> $filters
     * @return Builder<VisitLog>
     */
    private function visitLogs(array $filters): Builder
    {
        $events = $this->values($filters['event'] ?? [], VisitLog::EVENT_TYPES);
        $outcomes = $this->values($filters['outcome'] ?? [], VisitLog::OUTCOMES);
        $keyword = trim((string) ($filters['keyword'] ?? ''));
        $statusCode = filter_var($filters['status_code'] ?? null, FILTER_VALIDATE_INT);
        $sort = (string) ($filters['sort'] ?? '');
        $direction = $this->direction($filters['direction'] ?? null, 'desc');
        $sortColumns = ['occurred_at' => 'occurred_at', 'ip_address' => 'ip_address', 'location_city' => 'location_city', 'event_type' => 'event_type', 'status_code' => 'status_code'];

        return VisitLog::query()->whereIn('event_type', VisitLog::EVENT_TYPES)->with('user:id,name,email')
            ->when($keyword !== '', static fn ($query) => $query->where(static fn ($query) => $query->where('ip_address', 'like', "%{$keyword}%")->orWhere('location_city', 'like', "%{$keyword}%")->orWhere('location_region', 'like', "%{$keyword}%")->orWhere('location_country_code', 'like', "%{$keyword}%")->orWhereHas('user', static fn ($query) => $query->where('name', 'like', "%{$keyword}%")->orWhere('email', 'like', "%{$keyword}%"))))
            ->when($events !== [], static fn ($query) => $query->whereIn('event_type', $events))
            ->when($outcomes !== [], static fn ($query) => $query->whereIn('outcome', $outcomes))
            ->when(is_int($statusCode) && $statusCode >= 100 && $statusCode <= 599, static fn ($query) => $query->where('status_code', $statusCode))
            ->when(($from = $this->date($filters['from'] ?? null)) !== null, static fn ($query) => $query->where('occurred_at', '>=', $from->startOfDay()))
            ->when(($to = $this->date($filters['to'] ?? null)) !== null, static fn ($query) => $query->where('occurred_at', '<=', $to->endOfDay()))
            ->when(isset($sortColumns[$sort]), static fn ($query) => $query->orderBy($sortColumns[$sort], $direction), static fn ($query) => $query->latest('occurred_at'));
    }

    /** @param array<string, mixed> $filters
     * @return Builder<MediaAsset>
     */
    private function files(User $user, array $filters): Builder
    {
        $scopes = $filters['_file_scopes'] ?? $this->visibleFileScopes($user, (string) ($filters['record_status'] ?? 'active'));
        $scopes = is_array($scopes) ? array_intersect_key($scopes, array_flip(['files', 'gallery', 'avatars'])) : [];
        $scopes = array_filter($scopes, static fn (mixed $scope): bool => $scope === 'all' || $scope === 'owner');
        $requestedModule = (string) ($filters['module'] ?? '');
        if ($requestedModule !== '') {
            $scopes = isset($scopes[$requestedModule]) ? [$requestedModule => $scopes[$requestedModule]] : [];
        }
        $status = (string) ($filters['record_status'] ?? 'active');
        $query = MediaAsset::withTrashed()->with('uploader:id,name,email');
        if ($scopes === []) {
            $query->whereRaw('1 = 0');
        } else {
            $query->where(function ($moduleQuery) use ($scopes, $user): void {
                foreach ($scopes as $module => $scope) {
                    $moduleQuery->orWhere(function ($moduleQuery) use ($module, $scope, $user): void {
                        $moduleQuery->where('module', $module);
                        if ($scope === 'owner') {
                            $moduleQuery->where('uploader_id', $user->getKey());
                        }
                    });
                }
            });
        }
        if ($status === 'inactive') {
            $query->where('record_status', 0);
        } else {
            $query->where('record_status', 1);
        }

        $search = trim((string) ($filters['search'] ?? ''));

        return $query->when($search !== '', static fn ($query) => $query->where(static fn ($query) => $query->where('original_name', 'like', '%'.$search.'%')->orWhere('tag', 'like', '%'.$search.'%')))->latest('id');
    }

    /** @return array<string, 'all'|'owner'> */
    public function visibleFileScopes(User $user, string $status = 'active'): array
    {
        $admin = $user->hasAnyRole(['admin', 'super_admin']);
        $includeDeleted = $status === 'inactive';
        $scopes = [];
        if ($user->can('files.view') && (! $includeDeleted || $user->can('files.view_deleted'))) {
            $scopes['files'] = $admin ? 'all' : 'owner';
        }
        if ($user->can('media_assets.view') && (! $includeDeleted || $user->can('media_assets.view_deleted'))) {
            $scopes['gallery'] = $admin ? 'all' : 'owner';
        }
        if (! $includeDeleted || $user->can('users.view_deleted')) {
            if ($user->can('users.view')) {
                $scopes['avatars'] = 'all';
            } elseif ($user->can('files.view')) {
                $scopes['avatars'] = 'owner';
            }
        }

        return $scopes;
    }

    /** @param array<string, mixed> $filters
     * @return Builder<Country>
     */
    private function countries(User $user, array $filters): Builder
    {
        $canDeleted = $user->can('countries.view_deleted');
        $statuses = $this->values($filters['record_status'] ?? ['active'], ['active', 'inactive']);
        if (! $canDeleted) {
            $statuses = ['active'];
        }
        $sort = (string) ($filters['sort'] ?? '');
        $direction = $this->direction($filters['direction'] ?? null, 'asc');
        $sortColumns = ['code' => 'code', 'name' => 'name', 'created_at' => 'created_at', 'updated_at' => 'updated_at', 'record_status' => 'record_status'];

        return ($canDeleted ? Country::withTrashed() : Country::query())
            ->when(trim((string) ($filters['search'] ?? '')) !== '', static fn ($query) => $query->where(static function ($query) use ($filters): void {
                $search = trim((string) $filters['search']);
                $query->where('code', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%");
            }))
            ->when(($statuses ?: ['active']) !== ['active', 'inactive'], static fn ($query) => $query->whereIn('record_status', array_map(static fn (string $value): int => $value === 'active' ? 1 : 0, $statuses ?: ['active'])))
            ->when(($from = $this->date($filters['from'] ?? null)) !== null, static fn ($query) => $query->where('created_at', '>=', $from->startOfDay()))
            ->when(($to = $this->date($filters['to'] ?? null)) !== null, static fn ($query) => $query->where('created_at', '<=', $to->endOfDay()))
            ->when($sort === 'created_by', static fn ($query) => $query->orderBy(DB::table('users as created_actors')->select('created_actors.name')->whereColumn('created_actors.id', 'countries.created_by'), $direction))
            ->when($sort === 'updated_by', static fn ($query) => $query->orderBy(DB::table('users as updated_actors')->select('updated_actors.name')->whereColumn('updated_actors.id', 'countries.updated_by'), $direction))
            ->when($sort !== 'created_by' && $sort !== 'updated_by', static fn ($query) => $query->when(isset($sortColumns[$sort]), static fn ($query) => $query->orderBy($sortColumns[$sort], $direction), static fn ($query) => $query->orderBy('name')));
    }

    /** @param array<string, mixed> $filters
     * @return Builder<Timezone>
     */
    private function timezones(User $user, array $filters): Builder
    {
        $canDeleted = $user->can('timezones.view_deleted');
        $statuses = $this->values($filters['record_status'] ?? ['active'], ['active', 'inactive']);
        if (! $canDeleted) {
            $statuses = ['active'];
        }
        $sort = (string) ($filters['sort'] ?? '');
        $direction = $this->direction($filters['direction'] ?? null, 'asc');
        $sortColumns = ['name' => 'name', 'created_at' => 'created_at', 'updated_at' => 'updated_at', 'record_status' => 'record_status'];

        return ($canDeleted ? Timezone::withTrashed() : Timezone::query())
            ->when(trim((string) ($filters['search'] ?? '')) !== '', static fn ($query) => $query->where('name', 'like', '%'.trim((string) $filters['search']).'%'))
            ->when(($statuses ?: ['active']) !== ['active', 'inactive'], static fn ($query) => $query->whereIn('record_status', array_map(static fn (string $value): int => $value === 'active' ? 1 : 0, $statuses ?: ['active'])))
            ->when(($from = $this->date($filters['from'] ?? null)) !== null, static fn ($query) => $query->where('created_at', '>=', $from->startOfDay()))
            ->when(($to = $this->date($filters['to'] ?? null)) !== null, static fn ($query) => $query->where('created_at', '<=', $to->endOfDay()))
            ->when($sort === 'created_by', static fn ($query) => $query->orderBy(DB::table('users as created_actors')->select('created_actors.name')->whereColumn('created_actors.id', 'timezones.created_by'), $direction))
            ->when($sort === 'updated_by', static fn ($query) => $query->orderBy(DB::table('users as updated_actors')->select('updated_actors.name')->whereColumn('updated_actors.id', 'timezones.updated_by'), $direction))
            ->when($sort !== 'created_by' && $sort !== 'updated_by', static fn ($query) => $query->when(isset($sortColumns[$sort]), static fn ($query) => $query->orderBy($sortColumns[$sort], $direction), static fn ($query) => $query->orderBy('name')));
    }

    /** @param array<array-key, mixed> $allowed
     * @return list<string>
     */
    private function values(mixed $value, array $allowed): array
    {
        $values = is_array($value) ? $value : [$value];

        return array_values(array_unique(array_filter(array_map(static fn (mixed $item): string => is_scalar($item) ? (string) $item : '', $values), static fn (string $item): bool => in_array($item, $allowed, true))));
    }

    private function date(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return CarbonImmutable::createFromFormat('!Y-m-d', $value) ?: null;
    }

    /** @param 'asc'|'desc' $default
     * @return 'asc'|'desc'
     */
    private function direction(mixed $value, string $default): string
    {
        return $value === 'asc' || $value === 'desc' ? $value : $default;
    }
}
