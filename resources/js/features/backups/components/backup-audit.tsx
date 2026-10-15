import { Archive } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import { DataTable } from '@/components/ui/data-table';
import { audit, index } from '@/routes/system-settings/backups';
import type { BackupAuditProps } from '../types';
import { BackupFilters } from './backup-filters';
import { backupAuditColumns, backupPagination } from './backup-table-model';

export function BackupAudit({ events, filters, eventTypes }: BackupAuditProps) {
    return (
        <IndexPage
            title="Backup audit"
            description="Review who requested, created, uploaded, downloaded, deleted, or restored a package. History survives deletion and recovery."
            actions={
                <ActionLink href={index.url()} variant="outline">
                    <Archive aria-hidden="true" />
                    Backups
                </ActionLink>
            }
        >
            <IndexPageSection>
                <DataTable
                    caption="Backup audit events"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={events.data}
                    tableColumns={backupAuditColumns(audit.url(), filters)}
                    actions={
                        <BackupFilters
                            action={audit.url()}
                            filters={filters}
                            pageSize={events.per_page}
                            eventTypes={eventTypes}
                            audit
                        />
                    }
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No backup audit events match these filters.
                        </p>
                    }
                    columnVisibility={{
                        storageKey: 'backups.audit',
                        defaultVisibleKeys: [
                            'event',
                            'created_at',
                            'actor',
                            'backup',
                            'scope',
                            'tables',
                            'audit_note',
                            'status',
                        ],
                    }}
                    getRowKey={(event) => event.id}
                    pagination={backupPagination(events, 'events')}
                />
            </IndexPageSection>
        </IndexPage>
    );
}
