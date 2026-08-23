<?php

namespace App\Http\Controllers\Access;

use App\Actions\Rbac\AssignRoleToUser;
use App\Actions\Rbac\BulkChangeUserStatus;
use App\Actions\Rbac\ChangeUserStatus;
use App\Actions\Rbac\InviteUser;
use App\Actions\Rbac\RecordAccessAudit;
use App\Actions\Rbac\ResendInvitation;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\Access\AssignRoleRequest;
use App\Http\Requests\Access\BulkUserStatusRequest;
use App\Http\Requests\Access\InviteUserRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function create(): Response
    {
        $this->authorize('invite', User::class);

        return Inertia::render('access/user-create', [
            'roles' => $this->assignableRoles(),
        ]);
    }

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $search = trim((string) $request->input('search', ''));
        $status = (string) $request->input('status', '');
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $sortColumns = [
            'name' => 'name',
            'status' => 'status',
            'created_at' => 'created_at',
        ];

        return Inertia::render('access/users', [
            'users' => User::query()
                ->with('roles:id,name,display_name,is_system')
                ->when($search !== '', static fn ($query) => $query->where(static function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                }))
                ->when(in_array($status, ['active', 'suspended'], true), static fn ($query) => $query->where('status', $status))
                ->when(
                    isset($sortColumns[$sort]),
                    static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                    static fn ($query) => $query->orderBy('name'),
                )
                ->paginate(25)
                ->withQueryString()
                ->through(static fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status->value,
                    'role' => $user->roles->first() === null ? null : [
                        'id' => $user->roles->first()->id,
                        'name' => $user->roles->first()->name,
                        'displayName' => $user->roles->first()->display_name,
                        'isSystem' => (bool) $user->roles->first()->is_system,
                    ],
                    'createdAt' => $user->created_at?->toIso8601String(),
                ]),
            'invitations' => UserInvitation::query()
                ->with('role:id,name,display_name')
                ->whereNull('accepted_at')
                ->whereNull('revoked_at')
                ->latest()
                ->get()
                ->map(static fn (UserInvitation $invitation): array => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'role' => [
                        'id' => $invitation->role->id,
                        'name' => $invitation->role->name,
                        'displayName' => $invitation->role->display_name,
                    ],
                    'expiresAt' => $invitation->expires_at->toIso8601String(),
                ])->values(),
            'roles' => $this->assignableRoles(),
            'canInvite' => $request->user()->can('users.invite'),
            'canSuspend' => $request->user()->can('users.suspend'),
            'canReactivate' => $request->user()->can('users.update'),
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    /**
     * @return Collection<int, Role>
     */
    private function assignableRoles(): Collection
    {
        return Role::query()
            ->when(
                ! request()->user()->isOwner(),
                static fn ($query) => $query->whereNotIn('name', RoleName::ownerRoleNames()),
            )
            ->orderBy('display_name')
            ->get(['id', 'name', 'display_name', 'is_system']);
    }

    public function invite(InviteUserRequest $request, InviteUser $invite): RedirectResponse
    {
        $role = Role::query()->findOrFail($request->integer('role_id'));
        $invite->execute($request->string('email')->toString(), $role, $request->user());

        return back()->with('success', 'Invitation sent.');
    }

    public function assignRole(AssignRoleRequest $request, User $user, AssignRoleToUser $assign): RedirectResponse
    {
        $role = Role::query()->findOrFail($request->integer('role_id'));
        $this->authorize('assign', $role);
        $assign->execute($user, $role, $request->user());

        return back()->with('success', 'Role updated.');
    }

    public function suspend(User $user, ChangeUserStatus $change): RedirectResponse
    {
        $this->authorize('suspend', $user);
        $change->suspend($user, request()->user());

        return back()->with('success', 'User suspended.');
    }

    public function reactivate(User $user, ChangeUserStatus $change): RedirectResponse
    {
        $this->authorize('update', $user);
        $change->reactivate($user, request()->user());

        return back()->with('success', 'User reactivated.');
    }

    public function bulkSuspend(BulkUserStatusRequest $request, BulkChangeUserStatus $change): RedirectResponse
    {
        $users = User::query()->whereKey($this->validatedIds($request))->get();

        foreach ($users as $user) {
            $this->authorize('suspend', $user);
        }

        $count = $change->suspend($users, $request->user());

        return back()->with('success', "{$count} user(s) suspended.");
    }

    public function bulkReactivate(BulkUserStatusRequest $request, BulkChangeUserStatus $change): RedirectResponse
    {
        $users = User::query()->whereKey($this->validatedIds($request))->get();

        foreach ($users as $user) {
            $this->authorize('update', $user);
        }

        $count = $change->reactivate($users, $request->user());

        return back()->with('success', "{$count} user(s) reactivated.");
    }

    public function revokeInvitation(UserInvitation $invitation, RecordAccessAudit $audit): RedirectResponse
    {
        abort_unless(request()->user()->can('users.invite'), 403);

        if ($invitation->accepted_at === null && $invitation->revoked_at === null) {
            $invitation->forceFill(['revoked_at' => now()])->save();
            $audit->record('invitation.revoked', request()->user(), $invitation);
        }

        return back()->with('success', 'Invitation revoked.');
    }

    public function resendInvitation(UserInvitation $invitation, ResendInvitation $resend): RedirectResponse
    {
        abort_unless(request()->user()->can('users.invite'), 403);
        $resend->execute($invitation, request()->user());

        return back()->with('success', 'Invitation resent.');
    }

    /**
     * @return array<int, int>
     */
    private function validatedIds(BulkUserStatusRequest $request): array
    {
        return array_map(
            static fn (mixed $id): int => (int) $id,
            (array) $request->validated('ids'),
        );
    }
}
