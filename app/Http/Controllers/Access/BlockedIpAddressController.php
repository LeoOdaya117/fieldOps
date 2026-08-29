<?php

namespace App\Http\Controllers\Access;

use App\Actions\Security\ManageBlockedIpAddress;
use App\Http\Controllers\Controller;
use App\Http\Requests\Access\ActivateBlockedIpAddressRequest;
use App\Http\Requests\Access\DeactivateBlockedIpAddressRequest;
use App\Http\Requests\Access\DeleteBlockedIpAddressRequest;
use App\Http\Requests\Access\StoreBlockedIpAddressRequest;
use App\Http\Requests\Access\UpdateBlockedIpAddressRequest;
use App\Models\BlockedIpAddress;
use App\Support\Pagination\PageSize;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlockedIpAddressController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', BlockedIpAddress::class);

        $search = trim((string) $request->input('search', ''));
        $status = (string) $request->input('status', '');
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $sortColumns = [
            'ip_address' => 'ip_address',
            'is_active' => 'is_active',
            'blocked_at' => 'blocked_at',
            'last_seen_at' => 'last_seen_at',
        ];

        $rules = BlockedIpAddress::query()
            ->with(['user:id,name,email', 'blockedBy:id,name,email', 'unblockedBy:id,name,email'])
            ->when($search !== '', static fn ($query) => $query->where(static function ($query) use ($search): void {
                $query->where('ip_address', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('user', static fn ($userQuery) => $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            }))
            ->when(in_array($status, ['active', 'inactive'], true), static fn ($query) => $query->where('is_active', $status === 'active'))
            ->when(
                isset($sortColumns[$sort]),
                static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                static fn ($query) => $query->orderByDesc('is_active')->orderByDesc('last_seen_at')->orderByDesc('blocked_at'),
            )
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(static fn (BlockedIpAddress $rule): array => [
                'id' => $rule->id,
                'ipAddress' => $rule->ip_address,
                'user' => $rule->user === null ? null : [
                    'id' => $rule->user->id,
                    'name' => $rule->user->name,
                    'email' => $rule->user->email,
                ],
                'reason' => $rule->reason,
                'isActive' => $rule->is_active,
                'blockedAt' => $rule->blocked_at?->toIso8601String(),
                'firstSeenAt' => $rule->first_seen_at?->toIso8601String(),
                'lastSeenAt' => $rule->last_seen_at?->toIso8601String(),
                'blockedBy' => $rule->blockedBy === null ? null : [
                    'id' => $rule->blockedBy->id,
                    'name' => $rule->blockedBy->name,
                    'email' => $rule->blockedBy->email,
                ],
                'unblockedAt' => $rule->unblocked_at?->toIso8601String(),
                'unblockedBy' => $rule->unblockedBy === null ? null : [
                    'id' => $rule->unblockedBy->id,
                    'name' => $rule->unblockedBy->name,
                    'email' => $rule->unblockedBy->email,
                ],
            ]);

        return Inertia::render('access/ip-blocks', [
            'blockedIpAddresses' => $rules,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
            ],
            'canManage' => $request->user()?->can('ip_blocks.manage') === true,
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', BlockedIpAddress::class);

        return Inertia::render('access/ip-block-edit', [
            'blockedIpAddress' => null,
        ]);
    }

    public function show(BlockedIpAddress $blockedIpAddress): Response
    {
        $this->authorize('view', $blockedIpAddress);
        $blockedIpAddress->load(['user:id,name,email', 'blockedBy:id,name,email', 'unblockedBy:id,name,email']);

        return Inertia::render('access/ip-block-show', [
            'blockedIpAddress' => $this->details($blockedIpAddress),
            'canManage' => request()->user()?->can('update', $blockedIpAddress) === true,
        ]);
    }

    public function edit(BlockedIpAddress $blockedIpAddress): Response
    {
        $this->authorize('update', $blockedIpAddress);
        $blockedIpAddress->load('user:id,name,email');

        return Inertia::render('access/ip-block-edit', [
            'blockedIpAddress' => [
                'id' => $blockedIpAddress->id,
                'ipAddress' => $blockedIpAddress->ip_address,
                'user' => $blockedIpAddress->user === null ? null : [
                    'id' => $blockedIpAddress->user->id,
                    'name' => $blockedIpAddress->user->name,
                    'email' => $blockedIpAddress->user->email,
                ],
                'reason' => $blockedIpAddress->reason,
                'isActive' => $blockedIpAddress->is_active,
                'blockedAt' => $blockedIpAddress->blocked_at?->toIso8601String(),
                'firstSeenAt' => $blockedIpAddress->first_seen_at?->toIso8601String(),
                'lastSeenAt' => $blockedIpAddress->last_seen_at?->toIso8601String(),
            ],
        ]);
    }

    public function store(StoreBlockedIpAddressRequest $request, ManageBlockedIpAddress $manage): RedirectResponse
    {
        $manage->block(
            $request->string('ip_address')->toString(),
            $request->input('reason'),
            $request->user(),
        );

        return to_route('access.ip-blocks.index')->with('success', 'IP address blocked.');
    }

    public function activate(
        ActivateBlockedIpAddressRequest $request,
        BlockedIpAddress $blockedIpAddress,
        ManageBlockedIpAddress $manage,
    ): RedirectResponse {
        $manage->activate($blockedIpAddress, $request->user());

        return back()->with('success', 'IP address block activated.');
    }

    public function deactivate(
        DeactivateBlockedIpAddressRequest $request,
        BlockedIpAddress $blockedIpAddress,
        ManageBlockedIpAddress $manage,
    ): RedirectResponse {
        $manage->deactivate($blockedIpAddress, $request->user());

        return back()->with('success', 'IP address unblocked.');
    }

    public function update(
        UpdateBlockedIpAddressRequest $request,
        BlockedIpAddress $blockedIpAddress,
        ManageBlockedIpAddress $manage,
    ): RedirectResponse {
        $manage->updateReason(
            $blockedIpAddress,
            $request->input('reason'),
            $request->user(),
        );

        return to_route('access.ip-blocks.edit', $blockedIpAddress)->with('success', 'IP address details updated.');
    }

    public function destroy(
        DeleteBlockedIpAddressRequest $request,
        BlockedIpAddress $blockedIpAddress,
        ManageBlockedIpAddress $manage,
    ): RedirectResponse {
        $manage->delete($blockedIpAddress, $request->user());

        return to_route('access.ip-blocks.index')->with('success', 'IP address record deleted.');
    }

    /** @return array<string, mixed> */
    private function details(BlockedIpAddress $rule): array
    {
        return [
            'id' => $rule->id,
            'ipAddress' => $rule->ip_address,
            'user' => $rule->user === null ? null : [
                'id' => $rule->user->id,
                'name' => $rule->user->name,
                'email' => $rule->user->email,
            ],
            'reason' => $rule->reason,
            'isActive' => $rule->is_active,
            'blockedAt' => $rule->blocked_at?->toIso8601String(),
            'firstSeenAt' => $rule->first_seen_at?->toIso8601String(),
            'lastSeenAt' => $rule->last_seen_at?->toIso8601String(),
            'blockedBy' => $rule->blockedBy === null ? null : [
                'id' => $rule->blockedBy->id,
                'name' => $rule->blockedBy->name,
                'email' => $rule->blockedBy->email,
            ],
            'unblockedAt' => $rule->unblocked_at?->toIso8601String(),
            'unblockedBy' => $rule->unblockedBy === null ? null : [
                'id' => $rule->unblockedBy->id,
                'name' => $rule->unblockedBy->name,
                'email' => $rule->unblockedBy->email,
            ],
        ];
    }
}
