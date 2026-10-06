import { Plus, ScrollText, Upload } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import InputError from '@/components/input-error';
import { DataTable } from '@/components/ui/data-table';
import { audit, create, index } from '@/routes/system-settings/backups';
import { useBackupActions } from '../hooks/use-backup-actions';
import { useBackupPolling } from '../hooks/use-backup-polling';
import type { BackupPageProps } from '../types';
import { BackupFilters } from './backup-filters';
import { BackupRowActions } from './backup-row-actions';
import { BackupStatus } from './backup-status';
import { backupInventoryColumns, backupPagination } from './backup-table-model';

export function BackupInventory({
    backups,
    filters,
    operations,
    prerequisites,
    databaseName,
    busy,
    createdOperationId,
}: BackupPageProps) {
    const notice = useBackupPolling(busy, operations, createdOperationId);
    const ready =
        prerequisites.length > 0 && prerequisites.every((item) => item.ready);
    const actions = useBackupActions({
        databaseName,
        busy: busy || Boolean(notice),
        ready,
    });

    return (
        <IndexPage
            title="Backup & Restore"
            description="Manage signed database packages and review their recovery history."
            actions={
                <ActionLink href={audit.url()} variant="outline">
                    <ScrollText aria-hidden="true" />
                    Backup audit
                </ActionLink>
            }
        >
            <BackupStatus busy={busy} notice={notice} operations={operations} />
            <InputError message={actions.error} />
            {!ready && (
                <p className="text-sm text-muted-foreground">
                    Backup setup needs attention.{' '}
                    <ActionLink
                        href={create.url()}
                        variant="link"
                        className="h-auto px-0"
                    >
                        Review prerequisites
                    </ActionLink>
                </p>
            )}
            <IndexPageSection>
                <DataTable
                    caption="Saved database backups"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={backups.data}
                    tableColumns={[
                        ...backupInventoryColumns(index.url(), filters),
                        {
                            key: 'actions',
                            header: <span className="sr-only">Actions</span>,
                            hideable: false,
                            cell: (backup) => (
                                <BackupRowActions
                                    backup={backup}
                                    busy={actions.pending}
                                    ready={ready}
                                    onRestore={actions.onRestore}
                                    onDelete={actions.onDelete}
                                />
                            ),
                        },
                    ]}
                    actions={
                        <>
                            <BackupFilters
                                action={index.url()}
                                filters={filters}
                                pageSize={backups.per_page}
                            />
                            <ActionLink href={create.url()} variant="outline">
                                <Upload aria-hidden="true" />
                                Upload package
                            </ActionLink>
                            <ActionLink href={create.url()}>
                                <Plus aria-hidden="true" />
                                Create backup
                            </ActionLink>
                        </>
                    }
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            {[
                                filters.search,
                                filters.actor,
                                filters.scope,
                                filters.kind,
                                filters.from,
                                filters.to,
                            ].some(Boolean)
                                ? 'No backups match these filters.'
                                : 'No backups yet. Create a backup or upload a trusted package to begin.'}
                        </p>
                    }
                    columnVisibility={{
                        storageKey: 'backups.inventory',
                        defaultVisibleKeys: [
                            'backup',
                            'created_at',
                            'created_by',
                            'scope',
                            'tables',
                            'size_bytes',
                            'kind',
                        ],
                    }}
                    getRowKey={(backup) => backup.id}
                    getRowProps={(backup) => ({
                        id: `backup-${backup.id}`,
                        'data-backup-id': backup.id,
                    })}
                    pagination={backupPagination(backups, 'backups')}
                />
            </IndexPageSection>
            {actions.dialogs}
        </IndexPage>
    );
}
