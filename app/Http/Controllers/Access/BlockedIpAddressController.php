<?php

namespace App\Http\Controllers\Access;

use App\Actions\DataTables\BuildListingQuery;
use App\Actions\Security\ManageBlockedIpAddress;
use App\Http\Controllers\Controller;
use App\Http\Requests\Access\ActivateBlockedIpAddressRequest;
use App\Http\Requests\Access\DeactivateBlockedIpAddressRequest;
use App\Http\Requests\Access\DeleteBlockedIpAddressRequest;
use App\Http\Requests\Access\StoreBlockedIpAddressRequest;
use App\Http\Requests\Access\UpdateBlockedIpAddressRequest;
use App\Models\BlockedIpAddress;
use App\Models\User;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlockedIpAddressController extends Controller
{
    public function index(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('viewAny', BlockedIpAddress::class);

        $search = trim((string) $request->input('search', ''));
        $canViewDeleted = $request->user()?->can('ip_blocks.view_deleted') === true;
        $recordStatuses = $canViewDeleted
            ? $this->filterValues($request->input('record_status', ['active']), ['active', 'inactive'])
            : ['active'];
        $recordStatuses = $recordStatuses === [] ? ['active'] : $recordStatuses;
        $statuses = $this->filterValues($request->input('status'), ['active', 'inactive']);
        $from = $this->parseDate($request->input('from'));
        $to = $this->parseDate($request->input('to'));
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $rules = $listingQuery->query('ip-blocks', $request->user(), [
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
            ->through(fn (BlockedIpAddress $rule): array => [
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
                'createdAt' => $rule->created_at?->toIso8601String(),
                'updatedAt' => $rule->updated_at?->toIso8601String(),
                'createdBy' => $this->actor($rule->createdBy),
                'updatedBy' => $this->actor($rule->updatedBy),
                'recordStatus' => (int) $rule->record_status,
                'recordStatusUrl' => route('access.ip-blocks.record-status', $rule->getKey()),
            ]);

        return Inertia::render('access/ip-blocks', [
            'blockedIpAddresses' => $rules,
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
            'canCreate' => $request->user()?->can('ip_blocks.create') === true,
            'canUpdate' => $request->user()?->can('ip_blocks.update') === true,
            'canDelete' => $request->user()?->can('ip_blocks.delete') === true,
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => $request->user()?->can('ip_blocks.update_deleted') === true,
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', BlockedIpAddress::class);

        return Inertia::render('access/ip-block-edit', [
            'blockedIpAddress' => null,
        ]);
    }

    public function show(int $blockedIpAddress): Response
    {
        $canViewDeleted = request()->user()?->can('ip_blocks.view_deleted') === true;
        $blockedIpAddress = ($canViewDeleted ? BlockedIpAddress::withTrashed() : BlockedIpAddress::query())->findOrFail($blockedIpAddress);
        $this->authorize('view', $blockedIpAddress);
        $blockedIpAddress->load(['user:id,name,email', 'blockedBy:id,name,email', 'unblockedBy:id,name,email']);

        return Inertia::render('access/ip-block-show', [
            'blockedIpAddress' => $this->details($blockedIpAddress),
            'canUpdate' => request()->user()?->can('update', $blockedIpAddress) === true,
            'canDelete' => request()->user()?->can('delete', $blockedIpAddress) === true,
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => request()->user()?->can('ip_blocks.update_deleted') === true,
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
            'recordStatus' => (int) $rule->record_status,
            'recordStatusUrl' => route('access.ip-blocks.record-status', $rule->getKey()),
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
