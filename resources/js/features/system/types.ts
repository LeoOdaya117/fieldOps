export type AuditActor = {
    id: number;
    name: string;
    email: string;
} | null;

export type ReferenceDataAudit = {
    recordStatus: number;
    createdAt: string | null;
    updatedAt: string | null;
    createdBy: AuditActor;
    updatedBy: AuditActor;
};

export type Country = ReferenceDataAudit & {
    id: number;
    code: string;
    name: string;
};

export type Timezone = ReferenceDataAudit & {
    id: number;
    name: string;
};

export type ReferenceDataFilters = {
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
