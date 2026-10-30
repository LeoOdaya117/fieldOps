import type { AuditActor } from '@/types/audit';

export type AssetCondition =
    'operational' | 'needs_maintenance' | 'out_of_service';

export type Asset = {
    id: number;
    code: string;
    name: string;
    category: string;
    condition: AssetCondition;
    latitude: number | null;
    longitude: number | null;
    recordStatus: 0 | 1;
    recordStatusUrl: string;
    createdAt: string | null;
    updatedAt: string | null;
    createdBy: AuditActor;
    updatedBy: AuditActor;
};

export type AssetEvidence = {
    id: number;
    name: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    actorName: string | null;
    contentUrl: string;
    downloadUrl: string;
    thumbnailUrl: string | null;
    previewDataUrl: string | null;
    removeUrl: string;
};

export type AssetHistoryEvent = {
    id: number;
    event: string;
    occurredAt: string;
    actorName: string | null;
    changes: {
        before: Record<string, string | number | boolean | null>;
        after: Record<string, string | number | boolean | null>;
    };
};

export type AssetActivityPage<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    links: { url: string | null; label: string; active: boolean }[];
};

export type AssetFilters = {
    search: string;
    category?: string;
    condition?: AssetCondition | '';
    recordStatus?: string;
    perPage?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

export type PaginatedAssets = {
    data: Asset[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page?: number;
    links?: { url: string | null; label: string; active: boolean }[];
};

export const ASSET_CONDITIONS: {
    value: AssetCondition;
    label: string;
}[] = [
    { value: 'operational', label: 'Operational' },
    { value: 'needs_maintenance', label: 'Needs maintenance' },
    { value: 'out_of_service', label: 'Out of service' },
];

export function conditionLabel(condition: AssetCondition): string {
    return (
        ASSET_CONDITIONS.find((option) => option.value === condition)?.label ??
        condition
    );
}

export function formatCoordinate(value: number | null): string {
    return value === null ? 'Not set' : value.toFixed(6);
}
