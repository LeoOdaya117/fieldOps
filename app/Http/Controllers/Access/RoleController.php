<?php

namespace App\Http\Controllers\Access;

use App\Actions\Rbac\BulkDeleteRoles;
use App\Actions\Rbac\RecordAccessAudit;
use App\Actions\Rbac\ValidateRoleGrant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Access\BulkRoleDeleteRequest;
use App\Http\Requests\Access\SaveRoleRequest;
use App\Models\Role;
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
        $type = (string) $request->input('type', '');
        $assigned = (string) $request->input('assigned', '');
        $permissionsMin = trim((string) $request->input('permissions_min', ''));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $sortColumns = [
            'display_name' => 'display_name',
            'is_system' => 'is_system',
            'users_count' => 'users_count',
            'permissions_count' => 'permissions_count',
        ];

        $roles = Role::query()
            ->withCount(['users', 'permissions'])
            ->when($search !== '', static fn ($query) => $query->where(static function ($query) use ($search): void {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            }))
            ->when($type === 'system', static fn ($query) => $query->where('is_system', true))
            ->when($type === 'custom', static fn ($query) => $query->where('is_system', false))
            ->when($assigned === 'assigned', static fn ($query) => $query->has('users'))
            ->when($assigned === 'unassigned', static fn ($query) => $query->doesntHave('users'))
            ->when(ctype_digit($permissionsMin), static fn ($query) => $query->has('permissions', '>=', (int) $permissionsMin))
            ->when(
                isset($sortColumns[$sort]),
                static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                static fn ($query) => $query->orderBy('is_system', 'desc')->orderBy('display_name'),
            )
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('access/roles', [
            'roles' => $roles->through(static fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
                'displayName' => $role->display_name,
                'description' => $role->description,
                'isSystem' => (bool) $role->is_system,
                'usersCount' => $role->users_count,
                'permissionsCount' => $role->permissions_count,
            ]),
            'canManageSystemRoles' => $request->user()->isOwner(),
            'canDeleteRoles' => $request->user()->can('roles.delete'),
            'filters' => [
                'search' => $search,
                'type' => $type,
                'assigned' => $assigned,
                'permissionsMin' => $permissionsMin,
                'sort' => $sort,
                'direction' => $direction,
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
}
