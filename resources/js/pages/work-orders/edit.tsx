import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type {
    WorkOrder,
    WorkOrderAssetOption,
} from '@/features/work-orders/types';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import { WorkOrderForm } from '@/features/work-orders/components/work-order-form';
import { dashboard } from '@/routes';
import {
    index as workOrdersIndex,
    update as updateWorkOrder,
} from '@/routes/work-orders';

export default function WorkOrderEditPage({
    workOrder,
    assets = [],
}: {
    workOrder: WorkOrder;
    assets: WorkOrderAssetOption[];
}) {
    return (
        <>
            <Head title={`Edit ${workOrder.reference}`} />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink
                    href={workOrdersIndex.url()}
                    variant="ghost"
                    size="sm"
                >
                    <ArrowLeft />
                    Back to work orders
                </ActionLink>
                <Heading
                    title={`Edit ${workOrder.reference}`}
                    description="Update the work details while preserving its reference and captured location."
                />
                <WorkOrderForm
                    workOrder={workOrder}
                    assets={assets}
                    action={updateWorkOrder.url(workOrder.id)}
                    method="patch"
                    submitLabel="Save changes"
                    cancelHref={workOrdersIndex.url()}
                />
            </div>
        </>
    );
}

WorkOrderEditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Work orders', href: workOrdersIndex() },
        { title: 'Edit work order', href: workOrdersIndex() },
    ],
};
