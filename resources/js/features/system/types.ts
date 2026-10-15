import type { AuditTableFilters, StandardAuditFields } from '@/types/audit';

export type { AuditActor } from '@/types/audit';

export type ReferenceDataAudit = StandardAuditFields;

export type Country = ReferenceDataAudit & {
    id: number;
    code: string;
    name: string;
    recordStatusUrl?: string;
};

export type Timezone = ReferenceDataAudit & {
    id: number;
    name: string;
    recordStatusUrl?: string;
};

export type ReferenceDataFilters = AuditTableFilters & {
    search: string;
    perPage?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

export type PaginatedReferenceData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page?: number;
    links?: { url: string | null; label: string; active: boolean }[];
};
