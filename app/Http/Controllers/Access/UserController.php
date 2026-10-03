<?php

namespace App\Http\Controllers\Access;

use App\Actions\DataTables\BuildListingQuery;
use App\Actions\Rbac\ApproveRegistration;
use App\Actions\Rbac\AssignRoleToUser;
use App\Actions\Rbac\BulkChangeUserStatus;
use App\Actions\Rbac\ChangeUserStatus;
use App\Actions\Rbac\CreateUser;
use App\Actions\Rbac\DeleteUser;
use App\Actions\Rbac\InviteUser;
use App\Actions\Rbac\RecordAccessAudit;
use App\Actions\Rbac\RejectRegistration;
use App\Actions\Rbac\ResendInvitation;
use App\Actions\Rbac\UpdateUser;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Access\AssignRoleRequest;
use App\Http\Requests\Access\BulkUserStatusRequest;
use App\Http\Requests\Access\DeleteUserRequest;
use App\Http\Requests\Access\InviteUserRequest;
use App\Http\Requests\Access\ReviewRegistrationRequest;
use App\Http\Requests\Access\StoreUserRequest;
use App\Http\Requests\Access\UpdateUserRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\UserInvitation;
use App\Models\UserRegistration;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function create(): Response
    {
        $this->authorize('create', User::class);

        return Inertia::render('access/user-create', [
            'roles' => $this->assignableRoles(),
        ]);
    }

    public function inviteCreate(): Response
    {
        $this->authorize('invite', User::class);

        return Inertia::render('access/user-invite', [
            'roles' => $this->assignableRoles(),
        ]);
    }

    public function store(StoreUserRequest $request, CreateUser $create): RedirectResponse
    {
        $create->execute($request->validated(), $request->user());

        return to_route('access.users.index')->with('success', 'User created.');
    }

    public function edit(User $user): Response
    {
        $this->authorize('update', $user);

        $user->load('roles:id,name,display_name,is_system');

        return Inertia::render('access/user-edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'position' => $user->position,
                'department' => $user->department,
                'avatar' => $user->avatar,
                'blocked' => $user->status->value === 'suspended',
                'roleId' => $user->roles->first()?->id,
            ],
            'roles' => $this->assignableRoles(),
        ]);
    }

    public function show(int $user): Response
    {
        $canViewDeleted = request()->user()?->can('users.view_deleted') === true;
        $user = ($canViewDeleted ? User::withTrashed() : User::query())->findOrFail($user);
        $this->authorize('view', $user);

        $user->load('roles:id,name,display_name,is_system');

        return Inertia::render('access/user-show', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'position' => $user->position,
                'department' => $user->department,
                'avatar' => $user->avatar,
                'status' => $user->status->value,
                'role' => $user->roles->first() === null ? null : [
                    'id' => $user->roles->first()->id,
                    'name' => $user->roles->first()->name,
                    'displayName' => $user->roles->first()->display_name,
                ],
                'emailVerifiedAt' => $user->email_verified_at?->toIso8601String(),
                'createdAt' => $user->created_at?->toIso8601String(),
                'updatedAt' => $user->updated_at?->toIso8601String(),
                'recordStatus' => (int) $user->record_status,
                'recordStatusUrl' => route('access.users.record-status', $user->getKey()),
            ],
            'canEdit' => request()->user()?->can('update', $user) === true,
            'canDelete' => request()->user()?->can('delete', $user) === true,
            'canSuspend' => request()->user()?->can('suspend', $user) === true,
            'canReactivate' => request()->user()?->can('update', $user) === true,
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => request()->user()?->can('users.update_deleted') === true,
        ]);
    }

    public function update(UpdateUserRequest $request, User $user, UpdateUser $update): RedirectResponse
    {
        $update->execute($user, $request->user(), $request->validated());

        return to_route('access.users.index')->with('success', 'User updated.');
    }

    public function destroy(DeleteUserRequest $request, User $user, DeleteUser $delete): RedirectResponse
    {
        $this->authorize('delete', $user);
        $delete->execute($user, $request->user());

        return to_route('access.users.index')->with('success', 'User deleted.');
    }

    public function index(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('viewAny', User::class);

        $search = trim((string) $request->input('search', ''));
        $statuses = $this->filterValues($request->input('status'), ['active', 'suspended']);
        $canViewDeleted = $request->user()?->can('users.view_deleted') === true;
        $recordStatuses = $canViewDeleted
            ? $this->filterValues($request->input('record_status', ['active']), ['active', 'inactive'])
            : ['active'];
        $recordStatuses = $recordStatuses === [] ? ['active'] : $recordStatuses;
        $from = $this->parseDate($request->input('from'));
        $to = $this->parseDate($request->input('to'));
        $invitationSort = (string) $request->input('invitation_sort', '');
        $invitationDirection = $request->input('invitation_direction') === 'desc' ? 'desc' : 'asc';
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);

        return Inertia::render('access/users', [
            'users' => $listingQuery->query('users', $request->user(), [
                'search' => $search,
                'status' => $statuses,
                'record_status' => $recordStatuses,
                'from' => $from?->format('Y-m-d'),
                'to' => $to?->format('Y-m-d'),
                'sort' => $sort,
                'direction' => $direction,
            ])
                ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
                ->paginate($pageSize)
                ->appends(PageSize::query($request, $pageSize))
                ->through(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'position' => $user->position,
                    'department' => $user->department,
                    'avatar' => $user->avatar,
                    'status' => $user->status->value,
                    'role' => $user->roles->first() === null ? null : [
                        'id' => $user->roles->first()->id,
                        'name' => $user->roles->first()->name,
                        'displayName' => $user->roles->first()->display_name,
                        'isSystem' => (bool) $user->roles->first()->is_system,
                    ],
                    'canDelete' => $request->user()->can('delete', $user),
                    'createdAt' => $user->created_at?->toIso8601String(),
                    'updatedAt' => $user->updated_at?->toIso8601String(),
                    'createdBy' => $this->actor($user->createdBy),
                    'updatedBy' => $this->actor($user->updatedBy),
                    'recordStatus' => (int) $user->record_status,
                    'recordStatusUrl' => route('access.users.record-status', $user->getKey()),
                ]),
            'activeUsersCount' => User::query()
                ->where('status', UserStatus::Active->value)
                ->count(),
            'invitations' => $listingQuery->invitations($request->user(), [
                'record_status' => $recordStatuses,
                'invitation_sort' => $invitationSort,
                'invitation_direction' => $invitationDirection,
            ])
                ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
                ->get()
                ->map(fn (UserInvitation $invitation): array => [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'role' => [
                        'id' => $invitation->role->id,
                        'name' => $invitation->role->name,
                        'displayName' => $invitation->role->display_name,
                    ],
                    'expiresAt' => $invitation->expires_at->toIso8601String(),
                    'status' => $invitation->status,
                    'createdAt' => $invitation->created_at?->toIso8601String(),
                    'updatedAt' => $invitation->updated_at?->toIso8601String(),
                    'createdBy' => $this->actor($invitation->createdBy),
                    'updatedBy' => $this->actor($invitation->updatedBy),
                    'recordStatus' => (int) $invitation->record_status,
                    'recordStatusUrl' => route('access.users.invitations.record-status', $invitation->getKey()),
                ])->values(),
            'registrations' => $request->user()->can('users.review_registrations')
                ? $listingQuery->registrations([])
                    ->get(['id', 'name', 'email', 'status', 'created_at', 'updated_at'])
                    ->map(fn (UserRegistration $registration): array => [
                        'id' => $registration->id,
                        'name' => $registration->name,
                        'email' => $registration->email,
                        'status' => $registration->status->value,
                        'createdAt' => $registration->created_at?->toIso8601String(),
                        'updatedAt' => $registration->updated_at?->toIso8601String(),
                    ])->values()
                : collect(),
            'roles' => $this->assignableRoles(),
            'canCreate' => $request->user()->can('users.create'),
            'canInvite' => $request->user()->can('users.invite'),
            'canReviewRegistrations' => $request->user()->can('users.review_registrations'),
            'canEdit' => $request->user()->can('users.update'),
            'canSuspend' => $request->user()->can('users.suspend'),
            'canReactivate' => $request->user()->can('users.update'),
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => $request->user()->can('users.update_deleted'),
            'filters' => [
                'search' => $search,
                'status' => $this->filterValue($statuses),
                'from' => $from?->format('Y-m-d') ?? '',
                'to' => $to?->format('Y-m-d') ?? '',
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
                'recordStatus' => $this->filterValue($recordStatuses),
            ],
            'invitationFilters' => [
                'sort' => $invitationSort,
                'direction' => $invitationDirection,
                'recordStatus' => $this->filterValue($recordStatuses),
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
                ! request()->user()->isSuperAdmin(),
                static fn ($query) => $query->whereNotIn('name', RoleName::elevatedRoleNames()),
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

    public function registrations(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('reviewRegistrations', User::class);

        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';

        return Inertia::render('access/registrations', [
            'registrations' => $listingQuery->registrations([
                'sort' => $sort,
                'direction' => $direction,
            ])
                ->get(['id', 'name', 'email', 'status', 'created_at', 'updated_at'])
                ->map(fn (UserRegistration $registration): array => [
                    'id' => $registration->id,
                    'name' => $registration->name,
                    'email' => $registration->email,
                    'status' => $registration->status->value,
                    'createdAt' => $registration->created_at?->toIso8601String(),
                    'updatedAt' => $registration->updated_at?->toIso8601String(),
                ])->values(),
            'filters' => [
                'sort' => $sort,
                'direction' => $direction,
            ],
        ]);
    }

    public function reviewRegistration(UserRegistration $registration): Response
    {
        $this->authorize('reviewRegistrations', User::class);

        return Inertia::render('access/registration-review', [
            'registration' => [
                'id' => $registration->id,
                'name' => $registration->name,
                'email' => $registration->email,
                'status' => $registration->status->value,
                'createdAt' => $registration->created_at?->toIso8601String(),
                'updatedAt' => $registration->updated_at?->toIso8601String(),
            ],
            'roles' => $this->assignableRoles(),
        ]);
    }

    public function approveRegistration(
        ReviewRegistrationRequest $request,
        UserRegistration $registration,
        ApproveRegistration $approve,
    ): RedirectResponse {
        $role = Role::query()->findOrFail($request->integer('role_id'));
        $approve->execute($registration, $role, $request->user());

        return to_route('access.users.index')->with('success', 'Registration approved and user created.');
    }

    public function rejectRegistration(
        UserRegistration $registration,
        RejectRegistration $reject,
    ): RedirectResponse {
        abort_unless(request()->user()->can('users.review_registrations'), 403);
        $reject->execute($registration, request()->user());

        return to_route('access.users.index')->with('success', 'Registration rejected.');
    }

    public function assignRole(AssignRoleRequest $request, User $user, AssignRoleToUser $assign): RedirectResponse
    {
        $role = Role::query()->findOrFail($request->integer('role_id'));
        $this->authorize('assign', [$role, $user]);
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
