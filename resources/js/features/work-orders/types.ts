import type { AuditActor } from '@/types/audit';

export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent';
export type WorkOrderStatus = 'open' | 'cancelled';

export type WorkOrderAsset = {
    id: number;
    code: string;
    name: string;
};

export type WorkOrder = {
    id: number;
    reference: string;
    title: string;
    instructions: string | null;
    priority: WorkOrderPriority;
    dueDate: string;
    assetId: number | null;
    asset: WorkOrderAsset | null;
    locationLabel: string | null;
    latitude: number;
    longitude: number;
    status: WorkOrderStatus;
    recordStatus: 0 | 1;
    version: number;
    createdAt: string | null;
    updatedAt: string | null;
    createdBy: AuditActor;
    updatedBy: AuditActor;
    cancelUrl: string;
    recordStatusUrl: string;
};

export type WorkOrderAssetOption = WorkOrderAsset & {
    latitude: number | null;
    longitude: number | null;
};

export type WorkOrderFilters = {
    search: string;
    priority?: WorkOrderPriority | '';
    status?: WorkOrderStatus | '';
    recordStatus?: string;
    perPage?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

export type PaginatedWorkOrders = {
    data: WorkOrder[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page?: number;
    links?: { url: string | null; label: string; active: boolean }[];
};

export const WORK_ORDER_PRIORITIES: {
    value: WorkOrderPriority;
    label: string;
}[] = [
    { value: 'low', label: 'Low' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export function priorityLabel(priority: WorkOrderPriority): string {
    return (
        WORK_ORDER_PRIORITIES.find((option) => option.value === priority)
            ?.label ?? priority
    );
}

export function formatCoordinate(value: number): string {
    return value.toFixed(6);
}
