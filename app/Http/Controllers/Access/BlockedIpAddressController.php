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
use App\Models\User;
use App\Support\Pagination\PageSize;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BlockedIpAddressController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', BlockedIpAddress::class);

        $search = trim((string) $request->input('search', ''));
        $statuses = $this->filterValues($request->input('status'), ['active', 'inactive']);
        $from = $this->parseDate($request->input('from'));
        $to = $this->parseDate($request->input('to'));
        $createdFrom = $this->parseDate($request->input('created_from'));
        $createdTo = $this->parseDate($request->input('created_to'));
        $updatedFrom = $this->parseDate($request->input('updated_from'));
        $updatedTo = $this->parseDate($request->input('updated_to'));
        $createdBy = trim((string) $request->input('created_by', ''));
        $updatedBy = trim((string) $request->input('updated_by', ''));
        $recordStatuses = $this->filterValues($request->input('record_status'), ['active', 'inactive']);
        $sort = (string) $request->input('sort', '');
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';
        $pageSize = PageSize::resolve($request);
        $sortColumns = [
            'ip_address' => 'ip_address',
            'is_active' => 'is_active',
            'blocked_at' => 'blocked_at',
            'last_seen_at' => 'last_seen_at',
            'created_at' => 'created_at',
            'updated_at' => 'updated_at',
            'record_status' => 'record_status',
        ];

        $rules = BlockedIpAddress::query()
            ->with([
                'user:id,name,email',
                'blockedBy:id,name,email',
                'unblockedBy:id,name,email',
                'createdBy:id,name,email',
                'updatedBy:id,name,email',
            ])
            ->when($search !== '', static fn ($query) => $query->where(static function ($query) use ($search): void {
                $query->where('ip_address', 'like', "%{$search}%")
                    ->orWhere('reason', 'like', "%{$search}%")
                    ->orWhereHas('user', static fn ($userQuery) => $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            }))
            ->when($statuses !== [], static fn ($query) => $query->whereIn('is_active', array_map(static fn (string $status): bool => $status === 'active', $statuses)))
            ->when(in_array('inactive', $recordStatuses, true), static fn ($query) => $query->withTrashed())
            ->when($recordStatuses !== [], static fn ($query) => $query->whereIn(
                'record_status',
                array_map(static fn (string $status): int => $status === 'active' ? 1 : 0, $recordStatuses),
            ))
            ->when($from !== null, static fn ($query) => $query->where('blocked_at', '>=', $from->startOfDay()))
            ->when($to !== null, static fn ($query) => $query->where('blocked_at', '<=', $to->endOfDay()))
            ->when($createdFrom !== null, static fn ($query) => $query->where('created_at', '>=', $createdFrom->startOfDay()))
            ->when($createdTo !== null, static fn ($query) => $query->where('created_at', '<=', $createdTo->endOfDay()))
            ->when($updatedFrom !== null, static fn ($query) => $query->where('updated_at', '>=', $updatedFrom->startOfDay()))
            ->when($updatedTo !== null, static fn ($query) => $query->where('updated_at', '<=', $updatedTo->endOfDay()))
            ->when($createdBy !== '', static fn ($query) => $query->whereHas('createdBy', static fn ($actorQuery) => $actorQuery
                ->where('name', 'like', "%{$createdBy}%")
                ->orWhere('email', 'like', "%{$createdBy}%")))
            ->when($updatedBy !== '', static fn ($query) => $query->whereHas('updatedBy', static fn ($actorQuery) => $actorQuery
                ->where('name', 'like', "%{$updatedBy}%")
                ->orWhere('email', 'like', "%{$updatedBy}%")))
            ->when(
                $sort === 'created_by',
                static fn ($query) => $query->orderBy(
                    DB::table('users as created_actors')
                        ->select('created_actors.name')
                        ->whereColumn('created_actors.id', 'blocked_ip_addresses.created_by'),
                    $direction,
                ),
            )
            ->when(
                $sort === 'updated_by',
                static fn ($query) => $query->orderBy(
                    DB::table('users as updated_actors')
                        ->select('updated_actors.name')
                        ->whereColumn('updated_actors.id', 'blocked_ip_addresses.updated_by'),
                    $direction,
                ),
            )
            ->when(
                $sort !== 'created_by' && $sort !== 'updated_by',
                static fn ($query) => $query->when(
                    isset($sortColumns[$sort]),
                    static fn ($query) => $query->orderBy($sortColumns[$sort], $direction),
                    static fn ($query) => $query->orderByDesc('is_active')->orderByDesc('last_seen_at')->orderByDesc('blocked_at'),
                ),
            )
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
            ]);

        return Inertia::render('access/ip-blocks', [
            'blockedIpAddresses' => $rules,
            'filters' => [
                'search' => $search,
                'status' => $this->filterValue($statuses),
                'from' => $from?->format('Y-m-d') ?? '',
                'to' => $to?->format('Y-m-d') ?? '',
                'createdFrom' => $createdFrom?->format('Y-m-d') ?? '',
                'createdTo' => $createdTo?->format('Y-m-d') ?? '',
                'updatedFrom' => $updatedFrom?->format('Y-m-d') ?? '',
                'updatedTo' => $updatedTo?->format('Y-m-d') ?? '',
                'createdBy' => $createdBy,
                'updatedBy' => $updatedBy,
                'recordStatus' => $this->filterValue($recordStatuses),
                'sort' => $sort,
                'direction' => $direction,
                'perPage' => $pageSize,
            ],
            'canManage' => $request->user()?->can('ip_blocks.manage') === true,
            'canCreate' => $request->user()?->can('ip_blocks.manage') === true,
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
