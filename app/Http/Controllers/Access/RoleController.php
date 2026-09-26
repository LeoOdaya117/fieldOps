<?php

namespace App\Http\Controllers\Access;

use App\Actions\Rbac\BulkDeleteRoles;
use App\Actions\Rbac\RecordAccessAudit;
use App\Actions\Rbac\ValidateRoleGrant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Access\BulkRoleDeleteRequest;
use App\Http\Requests\Access\SaveRoleRequest;
use App\Models\Role;
use App\Models\User;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Role::class);

        $search = trim((string) $request->input('search', ''));
        $types = $this->filterValues($request->input('type'), ['system', 'custom']);
        $assignedValues = $this->filterValues($request->input('assigned'), ['assigned', 'unassigned']);
        $permissionsMin = trim((string) $request->input('permissions_min', ''));
        $from = $this->parseDate($request->input('from'));
        $to = $this->parseDate($request->input('to'));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $sortColumns = [
            'display_name' => 'display_name',
            'is_system' => 'is_system',
            'users_count' => 'users_count',
            'permissions_count' => 'permissions_count',
            'status' => 'status',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
            'record_status' => 'record_status',
        ];

        $roles = Role::query()
            ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
            ->withCount(['users', 'permissions'])
            ->when($search !== '', static fn ($query) => $query->where(static function ($query) use ($search): void {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            }))
            ->when(count($types) === 1, static fn ($query) => $query->where('is_system', $types[0] === 'system'))
            ->when(count($assignedValues) === 1 && $assignedValues[0] === 'assigned', static fn ($query) => $query->has('users'))
            ->when(count($assignedValues) === 1 && $assignedValues[0] === 'unassigned', static fn ($query) => $query->doesntHave('users'))
            ->when(ctype_digit($permissionsMin), static fn ($query) => $query->has('permissions', '>=', (int) $permissionsMin))
            ->when($from !== null, static fn ($query) => $query->where('created_at', '>=', $from->startOfDay()))
            ->when($to !== null, static fn ($query) => $query->where('created_at', '<=', $to->endOfDay()))
            ->when(
                $sort === 'created_by',
                static fn ($query) => $query->orderBy(
                    DB::table('users as created_actors')
                        ->select('created_actors.name')
                        ->whereColumn('created_actors.id', 'roles.created_by'),
                    $direction,
                ),
            )
            ->when(
                $sort === 'updated_by',
                static fn ($query) => $query->orderBy(
                    DB::table('users as updated_actors')
                        ->select('updated_actors.name')
                        ->whereColumn('updated_actors.id', 'roles.updated_by'),
                    $direction,
                ),
            )
            ->when(
                $sort !== 'created_by' && $sort !== 'updated_by',
                static fn ($query) => $query->when(
                    isset($sortColumns[$sort]),
                    static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                    static fn ($query) => $query->orderBy('is_system', 'desc')->orderBy('display_name'),
                ),
            )
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize));

        return Inertia::render('access/roles', [
            'roles' => $roles->through(fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
                'displayName' => $role->display_name,
                'description' => $role->description,
                'isSystem' => (bool) $role->is_system,
                'usersCount' => $role->users_count,
                'permissionsCount' => $role->permissions_count,
                'status' => $role->status,
                'recordStatus' => (int) $role->record_status,
                'createdAt' => $role->created_at?->toIso8601String(),
                'updatedAt' => $role->updated_at?->toIso8601String(),
                'createdBy' => $this->actor($role->createdBy),
                'updatedBy' => $this->actor($role->updatedBy),
            ]),
            'canManageSystemRoles' => $request->user()->isOwner(),
            'canCreate' => $request->user()->can('roles.create'),
            'canDeleteRoles' => $request->user()->can('roles.delete'),
            'filters' => [
                'search' => $search,
                'type' => $this->filterValue($types),
                'assigned' => $this->filterValue($assignedValues),
                'permissionsMin' => $permissionsMin,
                'from' => $from?->format('Y-m-d') ?? '',
                'to' => $to?->format('Y-m-d') ?? '',
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Role::class);

        return Inertia::render('access/role-create', [
            'permissions' => Permission::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function edit(Role $role): Response
    {
        $this->authorize('update', $role);

        return Inertia::render('access/role-edit', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'displayName' => $role->display_name,
                'description' => $role->description,
                'permissions' => $role->permissions()->orderBy('name')->pluck('name')->values(),
            ],
            'permissions' => Permission::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function show(Role $role): Response
    {
        $this->authorize('view', $role);

        $role->load(['permissions:id,name', 'users:id,name,email']);

        return Inertia::render('access/role-show', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'displayName' => $role->display_name,
                'description' => $role->description,
                'isSystem' => (bool) $role->is_system,
                'usersCount' => $role->users->count(),
                'permissionsCount' => $role->permissions->count(),
                'permissions' => $role->permissions->sortBy('name')->values()->map(static fn ($permission): string => $permission->name)->all(),
                'users' => $role->users->sortBy('name')->values()->map(static fn (Model $user): array => [
                    'id' => (int) $user->getKey(),
                    'name' => (string) $user->getAttribute('name'),
                    'email' => (string) $user->getAttribute('email'),
                ])->all(),
            ],
            'canEdit' => request()->user()?->can('update', $role) === true,
            'canDelete' => request()->user()?->can('delete', $role) === true,
        ]);
    }

    public function store(SaveRoleRequest $request, ValidateRoleGrant $grant, RecordAccessAudit $audit): RedirectResponse
    {
        $data = $request->validated();
        $role = DB::transaction(function () use ($data, $request, $grant, $audit): Role {
            $role = Role::query()->create([
                'name' => $data['name'],
                'guard_name' => 'web',
                'display_name' => $data['display_name'],
                'description' => $data['description'] ?? null,
                'is_system' => false,
            ]);
            $permissions = Permission::query()->whereIn('name', $data['permissions'] ?? [])->get();
            $role->syncPermissions($permissions);
            $grant->execute($request->user(), $role);
            $audit->record('role.created', $request->user(), $role, null, ['name' => $role->name, 'permissions' => $permissions->pluck('name')->values()->all()]);

            return $role;
        });

        return to_route('access.roles.index')->with('success', "Role {$role->display_name} created.");
    }

    public function update(SaveRoleRequest $request, Role $role, ValidateRoleGrant $grant, RecordAccessAudit $audit): RedirectResponse
    {
        $data = $request->validated();
        $before = ['name' => $role->name, 'display_name' => $role->display_name, 'description' => $role->description, 'permissions' => $role->permissions()->pluck('name')->values()->all()];

        DB::transaction(function () use ($data, $request, $role, $grant, $audit, $before): void {
            $role->update([
                'name' => $data['name'],
                'display_name' => $data['display_name'],
                'description' => $data['description'] ?? null,
            ]);
            $permissions = Permission::query()->whereIn('name', $data['permissions'] ?? [])->get();
            $role->syncPermissions($permissions);
            $grant->execute($request->user(), $role);
            $audit->record('role.updated', $request->user(), $role, $before, ['name' => $role->name, 'display_name' => $role->display_name, 'description' => $role->description, 'permissions' => $permissions->pluck('name')->values()->all()]);
        });

        return to_route('access.roles.index')->with('success', 'Role updated.');
    }

    public function destroy(Role $role, RecordAccessAudit $audit): RedirectResponse
    {
        $this->authorize('delete', $role);

        if ($role->users()->exists()) {
            throw ValidationException::withMessages(['role' => 'A role cannot be deleted while it is assigned to users.']);
        }

        DB::transaction(function () use ($role, $audit): void {
            $before = ['name' => $role->name, 'display_name' => $role->display_name];
            $role->delete();
            $audit->record('role.deleted', request()->user(), null, $before, null);
        });

        return to_route('access.roles.index')->with('success', 'Role deleted.');
    }

    public function bulkDestroy(BulkRoleDeleteRequest $request, BulkDeleteRoles $delete): RedirectResponse
    {
        $roles = Role::query()->whereKey($this->validatedIds($request))->get();

        foreach ($roles as $role) {
            $this->authorize('delete', $role);
        }

        $count = $delete->execute($roles, $request->user());

        return to_route('access.roles.index')->with('success', "{$count} role(s) deleted.");
    }

    /**
     * @return array<int, int>
     */
    private function validatedIds(BulkRoleDeleteRequest $request): array
    {
        return array_map(
            static fn (mixed $id): int => (int) $id,
            (array) $request->validated('ids'),
        );
    }

    private function parseDate(mixed $value): ?CarbonImmutable
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('Y-m-d', $value);
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param array<int, string> $allowed
     * @return array<int, string>
     */
    private function filterValues(mixed $value, array $allowed): array
    {
        $values = is_array($value) ? $value : [$value];

        return array_values(array_unique(array_filter(
            array_map(static fn (mixed $item): string => (string) $item, $values),
            static fn (string $item): bool => in_array($item, $allowed, true),
        )));
    }

    /** @param array<int, string> $values
     * @return string|array<int, string>
     */
    private function filterValue(array $values): string|array
    {
        return match (count($values)) {
            0 => '',
            1 => $values[0],
            default => $values,
        };
    }

    /** @return array{id: int, name: string, email: string}|null */
    private function actor(?User $actor): ?array
    {
        return $actor === null ? null : [
            'id' => (int) $actor->getKey(),
            'name' => (string) $actor->name,
            'email' => (string) $actor->email,
        ];
    }
}
