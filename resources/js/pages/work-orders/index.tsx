import { WorkOrdersList } from '@/features/work-orders/components/work-orders-list';
import type {
    PaginatedWorkOrders,
    WorkOrderFilters,
} from '@/features/work-orders/types';
import { dashboard } from '@/routes';
import { index as workOrdersIndex } from '@/routes/work-orders';

export default function WorkOrdersIndexPage(props: {
    workOrders: PaginatedWorkOrders;
    canCreate?: boolean;
    canUpdate?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
    filters: WorkOrderFilters;
}) {
    return <WorkOrdersList {...props} />;
}

WorkOrdersIndexPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Work orders', href: workOrdersIndex() },
    ],
};
