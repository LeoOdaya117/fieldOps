import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { WorkOrderAssetOption } from '@/features/work-orders/types';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import { WorkOrderForm } from '@/features/work-orders/components/work-order-form';
import { dashboard } from '@/routes';
import {
    create as createWorkOrder,
    index as workOrdersIndex,
    store as storeWorkOrder,
} from '@/routes/work-orders';

export default function WorkOrderCreatePage({
    assets = [],
}: {
    assets: WorkOrderAssetOption[];
}) {
    return (
        <>
            <Head title="Create work order" />
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
                    title="Create work order"
                    description="Record field work against an asset or a standalone location."
                />
                <WorkOrderForm
                    assets={assets}
                    action={storeWorkOrder.url()}
                    method="post"
                    submitLabel="Create work order"
                    cancelHref={workOrdersIndex.url()}
                />
            </div>
        </>
    );
}

WorkOrderCreatePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Work orders', href: workOrdersIndex() },
        { title: 'Create work order', href: createWorkOrder() },
    ],
};
