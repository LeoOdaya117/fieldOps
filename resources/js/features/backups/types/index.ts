export type Backup = {
    id: string;
    created_at: string;
    size_bytes: number;
    engine: string;
    server_version: string;
    kind: 'manual' | 'uploaded' | 'safety';
    protected?: boolean;
    scope: 'database' | 'tables';
    tables: string[] | null;
    requested_tables: string[] | null;
    created_by: BackupActor | null;
    stored_by: BackupActor | null;
    stored_at?: string;
    audit_note: string;
};

export type BackupActor = {
    id: string | null;
    name: string;
    source: 'web' | 'cli' | 'system';
};
export type BackupAuditEvent = {
    id: string;
    event: string;
    created_at: string;
    actor: BackupActor | null;
    backup_id: string | null;
    operation_id: string | null;
    scope: 'database' | 'tables' | null;
    tables: string[] | null;
    requested_tables: string[] | null;
    audit_note: string;
    status?: string | null;
    error?: string | null;
    source_created_by?: BackupActor | null;
    source_created_at?: string | null;
    source_audit_note?: string | null;
    stored_by?: BackupActor | null;
};

export type PaginatedBackups<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page: number;
    links: { url: string | null; label: string; active: boolean }[];
};

export type BackupFilters = {
    search?: string;
    actor?: string;
    scope?: string;
    kind?: string;
    event?: string;
    status?: string;
    backup?: string;
    from?: string;
    to?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    per_page?: number;
};

export type TableCatalogEntry = { name: string; related_tables: string[] };

export type BackupOperation = {
    id: string;
    type: 'backup' | 'restore';
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'interrupted';
    created_at: string;
    error: string | null;
    backup_id: string | null;
    safety_backup_id: string | null;
};

export type BackupCommonProps = {
    operations: BackupOperation[];
    prerequisites: { label: string; ready: boolean; message: string }[];
    databaseName: string;
    busy: boolean;
    maxUploadBytes: number;
};

export type BackupPageProps = BackupCommonProps & {
    backups: PaginatedBackups<Backup>;
    filters: BackupFilters;
};
export type BackupCreateProps = BackupCommonProps & {
    tableCatalog: TableCatalogEntry[];
    tableCatalogError?: string | null;
};
export type BackupDetailProps = BackupCommonProps & {
    backup: Backup;
    events: PaginatedBackups<BackupAuditEvent>;
    filters?: BackupFilters;
};
export type BackupAuditProps = {
    events: PaginatedBackups<BackupAuditEvent>;
    eventTypes: string[];
    filters: BackupFilters;
};

export function selectedTableClosure(
    requested: readonly string[],
    catalog: readonly TableCatalogEntry[],
): string[] {
    const included = new Set(requested);

    for (const entry of catalog) {
        if (requested.includes(entry.name)) {
            entry.related_tables.forEach((table) => included.add(table));
        }
    }

    return Array.from(included).sort();
}

export function backupActorLabel(actor: BackupActor | null): string {
    return actor
        ? `${actor.name}${actor.source === 'web' ? '' : ` (${actor.source})`}`
        : 'Unknown — legacy backup';
}

export function backupScopeLabel(scope: Backup['scope'] | null): string {
    return scope === 'tables'
        ? 'Selected tables'
        : scope === 'database'
          ? 'Full database'
          : 'Unknown';
}

export function formatBackupBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KiB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
}

export function formatBackupDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
