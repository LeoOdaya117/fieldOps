export type AuditActor = {
    id: number;
    name: string;
    email: string;
} | null;

export type StandardAuditFields = {
    createdAt: string | null;
    updatedAt: string | null;
    createdBy: AuditActor;
    updatedBy: AuditActor;
    recordStatus: number;
};

export type AuditTableFilters = {
    from?: string;
    to?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    recordStatus?: string | string[];
};
