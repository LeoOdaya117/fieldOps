import { Link } from '@inertiajs/react';
import { SortableColumn } from '@/components/sortable-column';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import type { TablePaginationProps } from '@/components/ui/table-pagination';
import { audit, show } from '@/routes/system-settings/backups';
import {
    backupActorLabel,
    backupScopeLabel,
    formatBackupBytes,
    formatBackupDate,
} from '../types';
import type {
    Backup,
    BackupAuditEvent,
    BackupFilters,
    PaginatedBackups,
} from '../types';

export function backupFilterQuery(
    filters: BackupFilters,
): Record<string, string | undefined> {
    return {
        search: filters.search,
        actor: filters.actor,
        scope: filters.scope,
        kind: filters.kind,
        event: filters.event,
        status: filters.status,
        backup: filters.backup,
        from: filters.from,
        to: filters.to,
        per_page: filters.per_page ? String(filters.per_page) : undefined,
    };
}

export function backupPagination<T>(
    page: PaginatedBackups<T>,
    itemLabel: string,
): TablePaginationProps {
    return {
        currentPage: page.current_page,
        lastPage: page.last_page,
        total: page.total,
        from: page.from,
        to: page.to,
        pageSize: page.per_page,
        links: page.links,
        itemLabel,
        previousUrl: page.links.find((link) => link.label.includes('Previous'))
            ?.url,
        nextUrl: page.links.find((link) => link.label.includes('Next'))?.url,
    };
}

function sortable(
    action: string,
    label: string,
    sortKey: string,
    filters: BackupFilters,
) {
    return (
        <SortableColumn
            action={action}
            label={label}
            sortKey={sortKey}
            sort={filters.sort}
            direction={filters.direction}
            hidden={backupFilterQuery(filters)}
        />
    );
}

export function backupInventoryColumns(
    action: string,
    filters: BackupFilters,
): DataTableColumn<Backup>[] {
    return [
        {
            key: 'backup',
            header: 'Backup',
            hideable: false,
            cell: (backup) => (
                <div className="space-y-1">
                    <Link
                        href={show.url(backup.id)}
                        className="font-medium text-link underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                        aria-label={`View backup ${backup.id}`}
                    >
                        {backup.id.slice(0, 8)}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                        {backup.engine} {backup.server_version}
                    </p>
                    {backup.protected && (
                        <Badge variant="secondary">Protected</Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'created_at',
            header: sortable(action, 'Created', 'created_at', filters),
            cell: (backup) => (
                <span className="text-sm tabular-nums">
                    {formatBackupDate(backup.created_at)}
                </span>
            ),
        },
        {
            key: 'created_by',
            header: sortable(action, 'Creator', 'actor', filters),
            cellClassName: 'max-w-56 whitespace-normal',
            cell: (backup) => backupActorLabel(backup.created_by),
        },
        {
            key: 'scope',
            header: sortable(action, 'Scope', 'scope', filters),
            cell: (backup) => (
                <Badge variant="secondary">
                    {backupScopeLabel(backup.scope)}
                </Badge>
            ),
        },
        {
            key: 'tables',
            header: sortable(action, 'Tables', 'table_count', filters),
            cell: (backup) =>
                backup.tables ? (
                    <span className="tabular-nums">{backup.tables.length}</span>
                ) : (
                    <span className="text-muted-foreground">Unknown</span>
                ),
        },
        {
            key: 'size_bytes',
            header: sortable(action, 'Size', 'size_bytes', filters),
            cell: (backup) => (
                <span className="tabular-nums">
                    {formatBackupBytes(backup.size_bytes)}
                </span>
            ),
        },
        {
            key: 'kind',
            header: sortable(action, 'Kind', 'kind', filters),
            cell: (backup) =>
                backup.kind === 'safety'
                    ? 'Safety backup'
                    : backup.kind === 'uploaded'
                      ? 'Uploaded backup'
                      : 'Manual backup',
        },
    ];
}

export function backupAuditColumns(
    action: string,
    filters: BackupFilters,
): DataTableColumn<BackupAuditEvent>[] {
    return [
        {
            key: 'event',
            header: sortable(action, 'Event', 'event', filters),
            cellClassName: 'max-w-56 whitespace-normal',
            cell: (event) => (
                <span className="font-medium">
                    {event.event.replace(/[._]/g, ' ')}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: sortable(action, 'Time', 'created_at', filters),
            cell: (event) => (
                <span className="tabular-nums">
                    {formatBackupDate(event.created_at)}
                </span>
            ),
        },
        {
            key: 'actor',
            header: sortable(action, 'Actor', 'actor', filters),
            cellClassName: 'max-w-56 whitespace-normal',
            cell: (event) =>
                event.actor ? backupActorLabel(event.actor) : 'Unknown actor',
        },
        {
            key: 'backup',
            header: 'Backup',
            cell: (event) =>
                event.backup_id ? (
                    <Link
                        href={audit.url({ query: { backup: event.backup_id } })}
                        className="text-link underline-offset-4 hover:underline"
                    >
                        {event.backup_id.slice(0, 8)}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'scope',
            header: 'Scope',
            cell: (event) => backupScopeLabel(event.scope),
        },
        {
            key: 'tables',
            header: 'Tables',
            cellClassName: 'max-w-64 whitespace-normal',
            cell: (event) =>
                event.tables ? (
                    <details>
                        <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                            {event.tables.length} included /{' '}
                            {event.requested_tables?.length ?? 0} requested
                        </summary>
                        <div className="mt-2 max-h-40 space-y-2 overflow-auto text-xs">
                            <p className="break-words">
                                Requested:{' '}
                                {event.requested_tables?.join(', ') ||
                                    'Full database'}
                            </p>
                            <p className="break-words">
                                Included: {event.tables.join(', ')}
                            </p>
                        </div>
                    </details>
                ) : (
                    <span className="text-muted-foreground">Not recorded</span>
                ),
        },
        {
            key: 'audit_note',
            header: 'Note',
            cellClassName: 'max-w-72 whitespace-normal break-words',
            cell: (event) => (
                <div className="space-y-2">
                    <p>{event.audit_note || '—'}</p>
                    {(event.source_created_by ||
                        event.source_created_at ||
                        event.source_audit_note ||
                        event.stored_by) && (
                        <details>
                            <summary className="cursor-pointer rounded-sm text-xs text-link focus-visible:outline-2 focus-visible:outline-ring">
                                Original package provenance
                            </summary>
                            <dl className="mt-2 space-y-2 text-xs">
                                <div>
                                    <dt className="font-medium">
                                        Original creator
                                    </dt>
                                    <dd>
                                        {backupActorLabel(
                                            event.source_created_by ?? null,
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium">
                                        Originally created
                                    </dt>
                                    <dd>
                                        {event.source_created_at
                                            ? formatBackupDate(
                                                  event.source_created_at,
                                              )
                                            : 'Not recorded'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium">
                                        Original note
                                    </dt>
                                    <dd className="whitespace-pre-wrap">
                                        {event.source_audit_note ||
                                            'No note recorded'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="font-medium">Stored by</dt>
                                    <dd>
                                        {backupActorLabel(
                                            event.stored_by ?? null,
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </details>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Result',
            cellClassName: 'max-w-64 whitespace-normal',
            cell: (event) => (
                <div className="space-y-1">
                    {event.status ? (
                        <Badge
                            variant={
                                event.status === 'failed' ||
                                event.status === 'interrupted'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                        >
                            {event.status}
                        </Badge>
                    ) : (
                        <span className="text-muted-foreground">Recorded</span>
                    )}
                    {event.error && (
                        <p className="text-xs text-destructive">
                            {event.error}
                        </p>
                    )}
                </div>
            ),
        },
    ];
}
