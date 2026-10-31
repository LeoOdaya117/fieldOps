import { router } from '@inertiajs/react';
import { useState } from 'react';
import { DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import { RecordStatusControl } from '@/components/ui/record-status-control';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ActionLink } from '@/components/action-link';
import type { WorkOrder } from '@/features/work-orders/types';
import { formatCoordinate, priorityLabel } from '@/features/work-orders/types';
import { formatDateTime } from '@/lib/format-date';
import { dashboard } from '@/routes';
import {
    edit as editWorkOrder,
    index as workOrdersIndex,
} from '@/routes/work-orders';

export default function WorkOrderShowPage({
    workOrder,
    canUpdate = false,
    canCancel = false,
    canUpdateDeleted = false,
}: {
    workOrder: WorkOrder;
    canUpdate?: boolean;
    canCancel?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
}) {
    const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState(false);
    const canManageOpen =
        canUpdate &&
        workOrder.recordStatus === 1 &&
        workOrder.status === 'open';
    const locationName = workOrder.asset
        ? `${workOrder.asset.code} · ${workOrder.asset.name}`
        : workOrder.locationLabel;

    return (
        <DetailsPage
            title={workOrder.reference}
            description="Review the work instructions, captured location, priority, and independent work and record statuses."
            backHref={workOrdersIndex.url()}
            backLabel="Back to work orders"
            actions={
                <>
                    {canManageOpen ? (
                        <ActionLink href={editWorkOrder.url(workOrder.id)}>
                            Edit
                        </ActionLink>
                    ) : null}
                    {canManageOpen && canCancel && workOrder.cancelUrl ? (
                        <>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={cancelling}
                                onClick={() => setCancelConfirmationOpen(true)}
                            >
                                Cancel work order
                            </Button>
                            <ConfirmDialog
                                open={cancelConfirmationOpen}
                                onOpenChange={setCancelConfirmationOpen}
                                destructive
                                options={{
                                    title: `Cancel ${workOrder.reference}?`,
                                    description:
                                        'This work order will remain in history and cannot be reopened in this phase.',
                                    confirmLabel: 'Cancel work order',
                                }}
                                onConfirm={() => {
                                    setCancelling(true);
                                    setCancelError(false);
                                    router.patch(
                                        workOrder.cancelUrl,
                                        { version: workOrder.version },
                                        {
                                            preserveScroll: true,
                                            onError: () => setCancelError(true),
                                            onFinish: () =>
                                                setCancelling(false),
                                        },
                                    );
                                }}
                            />
                            {cancelError ? (
                                <p
                                    role="alert"
                                    className="text-sm text-destructive"
                                >
                                    This work order may have changed. Reload and
                                    try again.
                                </p>
                            ) : null}
                        </>
                    ) : null}
                </>
            }
        >
            <DetailsView
                record={workOrder}
                summary={
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-lg font-semibold">
                            {workOrder.reference}
                        </span>
                        <Badge
                            variant={
                                workOrder.status === 'open'
                                    ? 'secondary'
                                    : 'outline'
                            }
                        >
                            {workOrder.status === 'open' ? 'Open' : 'Cancelled'}
                        </Badge>
                        <Badge variant="outline">
                            {priorityLabel(workOrder.priority)} priority
                        </Badge>
                    </div>
                }
                sections={[
                    {
                        key: 'work',
                        title: 'Work details',
                        description:
                            'The stable reference and instructions for this job.',
                        columns: [
                            {
                                key: 'reference',
                                label: 'Reference',
                                accessor: 'reference',
                            },
                            { key: 'title', label: 'Title', accessor: 'title' },
                            {
                                key: 'priority',
                                label: 'Priority',
                                cell: (record) =>
                                    priorityLabel(record.priority),
                            },
                            {
                                key: 'dueDate',
                                label: 'Due date',
                                accessor: 'dueDate',
                            },
                            {
                                key: 'instructions',
                                label: 'Instructions',
                                cell: (record) =>
                                    record.instructions ||
                                    'No instructions provided.',
                            },
                        ],
                    },
                    {
                        key: 'location',
                        title: 'Work location',
                        description:
                            'Coordinates are the location snapshot stored on this work order.',
                        columns: [
                            {
                                key: 'locationName',
                                label: 'Asset or location',
                                cell: () => locationName,
                            },
                            {
                                key: 'latitude',
                                label: 'Latitude',
                                cell: (record) =>
                                    formatCoordinate(record.latitude),
                            },
                            {
                                key: 'longitude',
                                label: 'Longitude',
                                cell: (record) =>
                                    formatCoordinate(record.longitude),
                            },
                        ],
                    },
                    {
                        key: 'record-status',
                        title: 'Record status',
                        description:
                            'Record activation is separate from the work lifecycle.',
                        content: (
                            <div className="space-y-3">
                                <RecordStatusControl
                                    recordStatus={workOrder.recordStatus}
                                    label={workOrder.reference}
                                    recordStatusUrl={workOrder.recordStatusUrl}
                                    canUpdateDeleted={canUpdateDeleted}
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Deactivation hides this record from default
                                    lists; it does not cancel the work order.
                                </p>
                            </div>
                        ),
                    },
                    {
                        key: 'audit',
                        title: 'Audit fields',
                        description: 'Creation and last update attribution.',
                        columns: [
                            {
                                key: 'createdAt',
                                label: 'Created at',
                                cell: (record) =>
                                    formatDateTime(record.createdAt),
                            },
                            {
                                key: 'createdBy',
                                label: 'Created by',
                                cell: (record) =>
                                    record.createdBy
                                        ? `${record.createdBy.name} (${record.createdBy.email})`
                                        : 'System',
                            },
                            {
                                key: 'updatedAt',
                                label: 'Last updated',
                                cell: (record) =>
                                    formatDateTime(record.updatedAt),
                            },
                            {
                                key: 'updatedBy',
                                label: 'Updated by',
                                cell: (record) =>
                                    record.updatedBy
                                        ? `${record.updatedBy.name} (${record.updatedBy.email})`
                                        : 'System',
                            },
                        ],
                    },
                ]}
            />
        </DetailsPage>
    );
}

WorkOrderShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Work orders', href: workOrdersIndex() },
        { title: 'Work-order details', href: workOrdersIndex() },
    ],
};
