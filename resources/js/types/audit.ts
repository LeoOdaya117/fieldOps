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
    createdFrom?: string;
    createdTo?: string;
    updatedFrom?: string;
    updatedTo?: string;
    createdBy?: string;
    updatedBy?: string;
    recordStatus?: string | string[];
    sort?: string;
    direction?: 'asc' | 'desc';
};

export function auditFilterQuery(filters: AuditTableFilters) {
    return {
        from: filters.from,
        to: filters.to,
        created_from: filters.createdFrom,
        created_to: filters.createdTo,
        updated_from: filters.updatedFrom,
        updated_to: filters.updatedTo,
        created_by: filters.createdBy,
        updated_by: filters.updatedBy,
        record_status: filters.recordStatus,
    };
}

export function auditFilterCount(filters: AuditTableFilters): number {
    return [
        filters.from,
        filters.to,
        filters.createdFrom,
        filters.createdTo,
        filters.updatedFrom,
        filters.updatedTo,
        filters.createdBy,
        filters.updatedBy,
        filters.recordStatus,
    ].reduce((count, value) => {
        if (Array.isArray(value)) {
            return count + value.filter(Boolean).length;
        }

        return count + (value ? 1 : 0);
    }, 0);
}
