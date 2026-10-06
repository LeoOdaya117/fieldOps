import { Download, RotateCcw, ScrollText, Trash2 } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { DetailsPage } from '@/components/details-page';
import { IndexPageSection } from '@/components/index-page';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { audit, download, index, show } from '@/routes/system-settings/backups';
import { useBackupActions } from '../hooks/use-backup-actions';
import { useBackupPolling } from '../hooks/use-backup-polling';
import {
    backupActorLabel,
    backupScopeLabel,
    formatBackupBytes,
    formatBackupDate,
} from '../types';
import type { BackupDetailProps } from '../types';
import { BackupStatus } from './backup-status';
import { backupAuditColumns, backupPagination } from './backup-table-model';

export function BackupDetail({
    backup,
    events,
    filters = {},
    operations,
    prerequisites,
    databaseName,
    busy,
}: BackupDetailProps) {
    const notice = useBackupPolling(busy);
    const ready =
        prerequisites.length > 0 && prerequisites.every((item) => item.ready);
    const actions = useBackupActions({
        databaseName,
        busy: busy || Boolean(notice),
        ready,
    });
    const automatic = (backup.tables ?? []).filter(
        (table) => !backup.requested_tables?.includes(table),
    );
    const metadata = [
        { label: 'Backup ID', value: backup.id },
        { label: 'Created', value: formatBackupDate(backup.created_at) },
        {
            label: 'Original creator',
            value: backupActorLabel(backup.created_by),
        },
        {
            label: backup.kind === 'uploaded' ? 'Uploaded by' : 'Stored by',
            value: backupActorLabel(backup.stored_by),
        },
        {
            label: 'Stored',
            value: backup.stored_at
                ? formatBackupDate(backup.stored_at)
                : 'Not recorded',
        },
        { label: 'Scope', value: backupScopeLabel(backup.scope) },
        {
            label: 'Database engine',
            value: `${backup.engine} ${backup.server_version}`,
        },
        { label: 'Package size', value: formatBackupBytes(backup.size_bytes) },
        {
            label: 'Kind',
            value:
                backup.kind === 'safety'
                    ? 'Safety backup'
                    : backup.kind === 'uploaded'
                      ? 'Uploaded backup'
                      : 'Manual backup',
        },
    ];

    return (
        <DetailsPage
            title="Backup details"
            description="Review the signed package metadata and the complete table scope before recovery."
            backHref={index.url()}
            backLabel="Back to backups"
            actions={
                <>
                    {actions.pending ? (
                        <Button disabled variant="outline">
                            <Download aria-hidden="true" />
                            Download
                        </Button>
                    ) : (
                        <Button asChild variant="outline">
                            <a href={download.url(backup.id)}>
                                <Download aria-hidden="true" />
                                Download
                            </a>
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        disabled={actions.pending || !ready}
                        onClick={() => actions.onRestore(backup)}
                    >
                        <RotateCcw aria-hidden="true" />
                        Restore
                    </Button>
                    <Button
                        variant="outline"
                        disabled={actions.pending || backup.protected}
                        onClick={() => actions.onDelete(backup)}
                    >
                        <Trash2 aria-hidden="true" />
                        Delete
                    </Button>
                </>
            }
        >
            <BackupStatus busy={busy} notice={notice} operations={operations} />
            <InputError message={actions.error} />
            {backup.protected && (
                <Badge variant="secondary">Protected during restore</Badge>
            )}
            <IndexPageSection title="Package information" headingLevel={2}>
                <dl className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
                    {metadata.map((item) => (
                        <div key={item.label} className="min-w-0">
                            <dt className="text-xs text-muted-foreground">
                                {item.label}
                            </dt>
                            <dd className="mt-1 text-sm font-medium break-words">
                                {item.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </IndexPageSection>
            <IndexPageSection title="Audit note" headingLevel={2}>
                <p className="p-5 text-sm whitespace-pre-wrap sm:p-6">
                    {backup.audit_note || 'No note was recorded.'}
                </p>
            </IndexPageSection>
            <IndexPageSection
                title={
                    backup.scope === 'tables'
                        ? 'Recorded table selection'
                        : 'Included database tables'
                }
                description={
                    backup.scope === 'tables'
                        ? 'Restore replaces all included tables together; tables outside this selection remain intact.'
                        : 'Restore replaces the entire database. Table extraction from a full backup is not supported.'
                }
            >
                <div className="space-y-5 p-5 text-sm sm:p-6">
                    {backup.tables === null ? (
                        <p className="text-muted-foreground">
                            This legacy package has no recorded table inventory.
                            It remains a full database backup; its original
                            creator is not known.
                        </p>
                    ) : (
                        <>
                            {backup.scope === 'tables' && (
                                <div>
                                    <h3 className="font-medium">
                                        Requested tables (
                                        {backup.requested_tables?.length ?? 0})
                                    </h3>
                                    <TableList
                                        tables={backup.requested_tables ?? []}
                                    />
                                </div>
                            )}
                            {backup.scope === 'tables' && (
                                <div>
                                    <h3 className="font-medium">
                                        Automatically included (
                                        {automatic.length})
                                    </h3>
                                    <TableList tables={automatic} />
                                </div>
                            )}
                            <div>
                                <h3 className="font-medium">
                                    All included tables ({backup.tables.length})
                                </h3>
                                <TableList tables={backup.tables} />
                            </div>
                        </>
                    )}
                    <p className="leading-6 text-muted-foreground">
                        Uploaded files and encryption keys are excluded.
                        Recovery requires a maintenance window, stopped writers,
                        and a full safety backup. Everyone must sign in again.
                    </p>
                </div>
            </IndexPageSection>
            <IndexPageSection
                title="Package audit trail"
                headingLevel={2}
                actions={
                    <ActionLink
                        href={audit.url({ query: { backup: backup.id } })}
                        variant="outline"
                    >
                        <ScrollText aria-hidden="true" />
                        Open audit history
                    </ActionLink>
                }
            >
                <DataTable
                    caption="Audit events for this backup"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={events.data}
                    tableColumns={backupAuditColumns(
                        show.url(backup.id),
                        filters,
                    )}
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No audit events were recorded for this package.
                        </p>
                    }
                    getRowKey={(event) => event.id}
                    pagination={backupPagination(events, 'events')}
                />
            </IndexPageSection>
            {actions.dialogs}
        </DetailsPage>
    );
}

function TableList({ tables }: { tables: readonly string[] }) {
    return tables.length ? (
        <ul className="mt-3 grid gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
                <li
                    key={table}
                    className="min-w-0 break-all text-muted-foreground"
                >
                    {table}
                </li>
            ))}
        </ul>
    ) : (
        <p className="mt-2 text-muted-foreground">None.</p>
    );
}
