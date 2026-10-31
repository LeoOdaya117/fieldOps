import { Edit, Eye } from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import { RecordStatusControl } from '@/components/ui/record-status-control';
import type { DataTableColumn } from '@/components/ui/data-table';
import { TableActionLink, TableActions } from '@/components/ui/table-actions';
import { formatDateTime } from '@/lib/format-date';
import {
    edit as editWorkOrder,
    index as workOrdersIndex,
    show as showWorkOrder,
} from '@/routes/work-orders';
import { priorityLabel } from '../types';
import type { WorkOrder, WorkOrderFilters } from '../types';

export function workOrderTableColumns({
    filters,
    canUpdate,
    canUpdateDeleted,
    firstRowNumber,
}: {
    filters: WorkOrderFilters;
    canUpdate: boolean;
    canUpdateDeleted: boolean;
    firstRowNumber: number;
}): DataTableColumn<WorkOrder>[] {
    const hidden = {
        search: filters.search,
        priority: filters.priority,
        status: filters.status,
        record_status: filters.recordStatus,
    };
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'asc';

    return [
        {
            key: 'serial',
            header: '#',
            hideable: false,
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_workOrder, index) => firstRowNumber + index,
        },
        {
            key: 'reference',
            label: 'Reference',
            header: (
                <SortableColumn
                    action={workOrdersIndex.url()}
                    label="Reference"
                    sortKey="reference"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (workOrder) => (
                <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold text-foreground">
                    {workOrder.reference}
                </code>
            ),
        },
        {
            key: 'title',
            label: 'Title',
            header: (
                <SortableColumn
                    action={workOrdersIndex.url()}
                    label="Title"
                    sortKey="title"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (workOrder) => (
                <span className="font-medium text-foreground">
                    {workOrder.title}
                </span>
            ),
        },
        {
            key: 'asset',
            label: 'Asset or location',
            header: 'Asset or location',
            cell: (workOrder) =>
                workOrder.asset
                    ? `${workOrder.asset.code} · ${workOrder.asset.name}`
                    : workOrder.locationLabel,
        },
        {
            key: 'priority',
            label: 'Priority',
            header: (
                <SortableColumn
                    action={workOrdersIndex.url()}
                    label="Priority"
                    sortKey="priority"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (workOrder) => priorityLabel(workOrder.priority),
        },
        {
            key: 'due_date',
            label: 'Due date',
            header: (
                <SortableColumn
                    action={workOrdersIndex.url()}
                    label="Due date"
                    sortKey="due_date"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (workOrder) => workOrder.dueDate,
        },
        {
            key: 'status',
            label: 'Work status',
            header: 'Work status',
            cell: (workOrder) =>
                workOrder.status === 'open' ? 'Open' : 'Cancelled',
        },
        {
            key: 'record_status',
            label: 'Record status',
            header: 'Record status',
            cell: (workOrder) => (
                <RecordStatusControl
                    recordStatus={workOrder.recordStatus}
                    label={workOrder.reference}
                    recordStatusUrl={workOrder.recordStatusUrl}
                    canUpdateDeleted={canUpdateDeleted}
                />
            ),
        },
        {
            key: 'updated_at',
            label: 'Last updated',
            header: (
                <SortableColumn
                    action={workOrdersIndex.url()}
                    label="Last updated"
                    sortKey="updated_at"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (workOrder) => formatDateTime(workOrder.updatedAt),
        },
        {
            key: 'actions',
            header: 'Actions',
            hideable: false,
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (workOrder) => (
                <TableActions label={`Actions for ${workOrder.reference}`}>
                    <TableActionLink href={showWorkOrder.url(workOrder.id)}>
                        <Eye />
                        View
                    </TableActionLink>
                    {canUpdate &&
                    workOrder.recordStatus === 1 &&
                    workOrder.status === 'open' ? (
                        <TableActionLink href={editWorkOrder.url(workOrder.id)}>
                            <Edit />
                            Edit
                        </TableActionLink>
                    ) : null}
                </TableActions>
            ),
        },
    ];
}
