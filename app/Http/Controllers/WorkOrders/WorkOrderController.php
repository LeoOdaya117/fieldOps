<?php

namespace App\Http\Controllers\WorkOrders;

use App\Actions\DataTables\BuildListingQuery;
use App\Actions\WorkOrders\CancelWorkOrder;
use App\Actions\WorkOrders\ManageWorkOrder;
use App\Http\Controllers\Controller;
use App\Http\Requests\WorkOrders\CancelWorkOrderRequest;
use App\Http\Requests\WorkOrders\SaveWorkOrderRequest;
use App\Models\Asset;
use App\Models\User;
use App\Models\WorkOrder;
use App\Support\Pagination\PageSize;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkOrderController extends Controller
{
    public function index(Request $request, BuildListingQuery $listingQuery): Response
    {
        $this->authorize('viewAny', WorkOrder::class);
        $user = $request->user();
        $canViewDeleted = $user->can('work_orders.view_deleted');
        $recordStatus = $canViewDeleted && $request->input('record_status') === 'inactive' ? 'inactive' : 'active';
        $sortInput = $request->input('sort');
        $sort = is_string($sortInput) && in_array($sortInput, ['reference', 'title', 'priority', 'due_date', 'status', 'created_at', 'updated_at', 'record_status'], true) ? $sortInput : '';
        $searchInput = $request->input('search');
        $priorityInput = $request->input('priority');
        $statusInput = $request->input('status');
        $filters = [
            'search' => mb_substr(is_string($searchInput) ? trim($searchInput) : '', 0, 100),
            'priority' => is_string($priorityInput) && in_array($priorityInput, WorkOrder::PRIORITIES, true) ? $priorityInput : '',
            'status' => is_string($statusInput) && in_array($statusInput, WorkOrder::STATUSES, true) ? $statusInput : '',
            'record_status' => $recordStatus,
            'sort' => $sort,
            'direction' => $request->input('direction') === 'desc' ? 'desc' : 'asc',
        ];
        $pageSize = PageSize::resolve($request);
        $workOrders = $listingQuery->query('work-orders', $user, $filters)
            ->with(['createdBy:id,name,email', 'updatedBy:id,name,email'])
            ->paginate($pageSize)
            ->appends(PageSize::query($request, $pageSize))
            ->through(fn (WorkOrder $workOrder): array => $this->serialize($workOrder));

        return Inertia::render('work-orders/index', [
            'workOrders' => $workOrders,
            'canCreate' => $user->can('work_orders.create'),
            'canUpdate' => $user->can('work_orders.update'),
            'canViewDeleted' => $canViewDeleted,
            'canUpdateDeleted' => $user->can('work_orders.update_deleted'),
            'filters' => [
                'search' => $filters['search'],
                'priority' => $filters['priority'],
                'status' => $filters['status'],
                'recordStatus' => $recordStatus,
                'sort' => $filters['sort'],
                'direction' => $filters['direction'],
                'perPage' => $pageSize,
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $this->authorize('create', WorkOrder::class);

        return Inertia::render('work-orders/create', ['assets' => $this->assetOptions($request->user())]);
    }

    public function store(SaveWorkOrderRequest $request, ManageWorkOrder $manage): RedirectResponse
    {
        $workOrder = $manage->create($request->validatedWorkOrderForCreate(), $request->user());

        return to_route('work-orders.show', $workOrder)->with('success', "Work order {$workOrder->reference} created.");
    }

    public function show(int $workOrder): Response
    {
        $canViewDeleted = request()->user()->can('work_orders.view_deleted');
        $record = ($canViewDeleted ? WorkOrder::withTrashed() : WorkOrder::query())->findOrFail($workOrder);
        $this->authorize('view', $record);

        return Inertia::render('work-orders/show', [
            'workOrder' => $this->serialize($record->load(['createdBy:id,name,email', 'updatedBy:id,name,email'])),
            'canUpdate' => ! $record->trashed() && $record->status === 'open' && request()->user()->can('work_orders.update'),
            'canCancel' => ! $record->trashed() && $record->status === 'open' && request()->user()->can('work_orders.update'),
            'canUpdateDeleted' => request()->user()->can('work_orders.update_deleted'),
        ]);
    }

    public function edit(Request $request, int $workOrder): Response
    {
        $record = WorkOrder::query()->findOrFail($workOrder);
        $this->authorize('update', $record);
        abort_unless($record->status === 'open', 404);
        $record->load(['createdBy:id,name,email', 'updatedBy:id,name,email']);

        return Inertia::render('work-orders/edit', [
            'workOrder' => $this->serialize($record),
            'assets' => $this->assetOptions($request->user(), $record),
        ]);
    }

    public function update(SaveWorkOrderRequest $request, int $workOrder, ManageWorkOrder $manage): RedirectResponse
    {
        $record = $manage->update($workOrder, $request->validatedWorkOrderForUpdate(), $request->user());

        return to_route('work-orders.show', $record)->with('success', 'Work order updated.');
    }

    public function cancel(CancelWorkOrderRequest $request, int $workOrder, CancelWorkOrder $cancel): RedirectResponse
    {
        $record = WorkOrder::withTrashed()->findOrFail($workOrder);
        $this->authorize('update', $record);
        $cancel->execute($workOrder, (int) $request->validated('version'), $request->user());

        return to_route('work-orders.show', $workOrder)->with('success', 'Work order cancelled.');
    }

    /** @return list<array{id: int, code: string, name: string, latitude: float|null, longitude: float|null, recordStatus: int}> */
    private function assetOptions(User $user, ?WorkOrder $workOrder = null): array
    {
        if (! $user->can('assets.view')) {
            return [];
        }

        $assets = Asset::query()->orderBy('name')->get(['id', 'code', 'name', 'latitude', 'longitude', 'record_status'])
            ->map(fn (Asset $asset): array => [
                'id' => (int) $asset->id,
                'code' => $asset->code,
                'name' => $asset->name,
                'latitude' => $asset->latitude,
                'longitude' => $asset->longitude,
                'recordStatus' => (int) $asset->record_status,
            ]);

        if ($workOrder !== null && $workOrder->asset_id !== null && ! $assets->contains('id', (int) $workOrder->asset_id)) {
            $assets->push([
                'id' => (int) $workOrder->asset_id,
                'code' => (string) $workOrder->asset_code_snapshot,
                'name' => (string) $workOrder->asset_name_snapshot,
                'latitude' => null,
                'longitude' => null,
                'recordStatus' => 0,
            ]);
        }

        return array_values($assets->all());
    }

    /** @return array<string, mixed> */
    private function serialize(WorkOrder $workOrder): array
    {
        return [
            'id' => (int) $workOrder->getKey(),
            'reference' => $workOrder->reference,
            'title' => $workOrder->title,
            'instructions' => $workOrder->instructions,
            'priority' => $workOrder->priority,
            'dueDate' => $workOrder->due_date->toDateString(),
            'assetId' => $workOrder->asset_id,
            'asset' => $workOrder->asset_id === null ? null : [
                'id' => (int) $workOrder->asset_id,
                'code' => $workOrder->asset_code_snapshot,
                'name' => $workOrder->asset_name_snapshot,
            ],
            'locationLabel' => $workOrder->location_label,
            'latitude' => $workOrder->latitude,
            'longitude' => $workOrder->longitude,
            'status' => $workOrder->status,
            'recordStatus' => (int) $workOrder->record_status,
            'version' => (int) $workOrder->version,
            'createdAt' => $workOrder->created_at->toIso8601String(),
            'updatedAt' => $workOrder->updated_at->toIso8601String(),
            'createdBy' => $this->actor($workOrder->createdBy),
            'updatedBy' => $this->actor($workOrder->updatedBy),
            'cancelUrl' => route('work-orders.cancel', $workOrder->getKey()),
            'recordStatusUrl' => route('work-orders.record-status', $workOrder->getKey()),
        ];
    }

    /** @return array{id: int, name: string, email: string}|null */
    private function actor(?User $actor): ?array
    {
        return $actor === null ? null : ['id' => (int) $actor->getKey(), 'name' => (string) $actor->name, 'email' => (string) $actor->email];
    }
}
