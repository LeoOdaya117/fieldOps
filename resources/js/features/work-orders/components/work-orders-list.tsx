import { Plus } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import {
    create as createWorkOrder,
    index as workOrdersIndex,
} from '@/routes/work-orders';
import { WORK_ORDER_PRIORITIES } from '../types';
import type { PaginatedWorkOrders, WorkOrderFilters } from '../types';
import { workOrderTableColumns } from './work-order-table-model';

export function WorkOrdersList({
    workOrders,
    canCreate = false,
    canUpdate = false,
    canViewDeleted = false,
    canUpdateDeleted = false,
    filters,
}: {
    workOrders: PaginatedWorkOrders;
    canCreate?: boolean;
    canUpdate?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
    filters: WorkOrderFilters;
}) {
    const pageSize =
        workOrders.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const previousUrl = workOrders.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = workOrders.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;
    const hidden = {
        search: filters.search,
        priority: filters.priority,
        status: filters.status,
        record_status: filters.recordStatus,
    };

    return (
        <IndexPage
            title="Work orders"
            description="Plan and track authorized field work."
            actions={
                canCreate ? (
                    <ActionLink href={createWorkOrder.url()}>
                        <Plus />
                        Create work order
                    </ActionLink>
                ) : null
            }
        >
            <IndexPageSection>
                <DataTable
                    caption="Work orders"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={workOrders.data}
                    tableColumns={() =>
                        workOrderTableColumns({
                            filters,
                            canUpdate,
                            canUpdateDeleted,
                            firstRowNumber: workOrders.from ?? 1,
                        })
                    }
                    actions={
                        <SearchFilterSheet
                            action={workOrdersIndex.url()}
                            resetHref={workOrdersIndex.url()}
                            title="Search and filter work orders"
                            description="Find work orders by reference, title, instructions, or location."
                            activeFilterCount={
                                [
                                    filters.search,
                                    filters.priority,
                                    filters.status,
                                ].filter(Boolean).length +
                                (filters.recordStatus &&
                                filters.recordStatus !== 'active'
                                    ? 1
                                    : 0)
                            }
                            pageSize={pageSize}
                            keyword={
                                <div className="grid gap-2">
                                    <Label htmlFor="work-order-search">
                                        Search
                                    </Label>
                                    <Input
                                        id="work-order-search"
                                        name="search"
                                        defaultValue={filters.search}
                                        placeholder="Reference, title, or location"
                                        autoFocus
                                    />
                                </div>
                            }
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="work-order-priority-filter">
                                    Priority
                                </Label>
                                <AdaptiveSelect
                                    id="work-order-priority-filter"
                                    name="priority"
                                    aria-label="Priority"
                                    multiple={false}
                                    defaultValue={filters.priority ?? ''}
                                    options={[
                                        { value: '', label: 'All priorities' },
                                        ...WORK_ORDER_PRIORITIES,
                                    ]}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="work-order-status-filter">
                                    Work status
                                </Label>
                                <AdaptiveSelect
                                    id="work-order-status-filter"
                                    name="status"
                                    aria-label="Work status"
                                    multiple={false}
                                    defaultValue={filters.status ?? ''}
                                    options={[
                                        { value: '', label: 'All statuses' },
                                        { value: 'open', label: 'Open' },
                                        {
                                            value: 'cancelled',
                                            label: 'Cancelled',
                                        },
                                    ]}
                                />
                            </div>
                            {canViewDeleted ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="work-order-record-status-filter">
                                        Record status
                                    </Label>
                                    <AdaptiveSelect
                                        id="work-order-record-status-filter"
                                        name="record_status"
                                        aria-label="Record status"
                                        multiple={false}
                                        defaultValue={
                                            filters.recordStatus ?? 'active'
                                        }
                                        options={[
                                            {
                                                value: 'active',
                                                label: 'Active',
                                            },
                                            {
                                                value: 'inactive',
                                                label: 'Inactive',
                                            },
                                        ]}
                                    />
                                </div>
                            ) : null}
                        </SearchFilterSheet>
                    }
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No work orders match the current filters.
                        </p>
                    }
                    addDefaultColumns
                    canUpdateDeleted={canUpdateDeleted}
                    defaultColumnSort={{
                        action: workOrdersIndex.url(),
                        sort: filters.sort,
                        direction: filters.direction,
                        hidden,
                    }}
                    columnVisibility={{
                        storageKey: 'work-orders.directory',
                        defaultVisibleKeys: [
                            'reference',
                            'title',
                            'asset',
                            'priority',
                            'due_date',
                            'status',
                            'record_status',
                        ],
                    }}
                    getRowKey={(workOrder) => workOrder.id}
                    pagination={{
                        currentPage: workOrders.current_page,
                        lastPage: workOrders.last_page,
                        total: workOrders.total,
                        from: workOrders.from,
                        to: workOrders.to,
                        pageSize,
                        links: workOrders.links,
                        itemLabel: 'work orders',
                        previousUrl,
                        nextUrl,
                    }}
                />
            </IndexPageSection>
        </IndexPage>
    );
}
