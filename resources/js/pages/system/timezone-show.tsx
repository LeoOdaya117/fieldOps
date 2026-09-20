import { Clock3, Pencil, Trash2 } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { DetailsActionForm, DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import {
    RecordStatusSwitch,
    formatDate,
} from '@/features/system/reference-data-table-model';
import type { AuditActor, Timezone } from '@/features/system/types';
import { dashboard } from '@/routes';
import {
    destroy as deleteTimezone,
    edit as editTimezone,
    index as timezonesIndex,
} from '@/routes/system/timezones';

function actorLabel(actor: AuditActor): string {
    return actor ? `${actor.name} (${actor.email})` : 'System seed';
}

export default function TimezoneShowPage({
    timezone,
    canEdit = false,
    canDelete = false,
    isCurrent = false,
}: {
    timezone: Timezone;
    canEdit?: boolean;
    canDelete?: boolean;
    isCurrent?: boolean;
}) {
    return (
        <DetailsPage
            title={timezone.name}
            description="Review the IANA identifier, record status, and audit history."
            backHref={timezonesIndex.url()}
            backLabel="Back to timezones"
            actions={
                <>
                    {canEdit ? (
                        <ActionLink href={editTimezone.url(timezone.id)}>
                            <Pencil />
                            Edit
                        </ActionLink>
                    ) : null}
                    {canDelete && !isCurrent ? (
                        <DetailsActionForm
                            action={deleteTimezone.url(timezone.id)}
                            method="delete"
                            destructive
                            confirmation={{
                                title: `Delete ${timezone.name}?`,
                                description:
                                    'This will soft-delete the timezone and keep its audit history.',
                                confirmLabel: 'Delete',
                            }}
                        >
                            <Trash2 />
                            Delete
                        </DetailsActionForm>
                    ) : null}
                </>
            }
        >
            <DetailsView
                record={timezone}
                summary={
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-link/10 text-link">
                            <Clock3 className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="font-mono text-lg font-semibold break-all">
                                {timezone.name}
                            </h2>
                            {isCurrent ? (
                                <p className="mt-2 text-xs font-medium text-link">
                                    Current system timezone
                                </p>
                            ) : null}
                        </div>
                    </div>
                }
                sections={[
                    {
                        key: 'definition',
                        title: 'Timezone definition',
                        description:
                            'The IANA identifier used to apply system date and time behavior.',
                        columns: [
                            {
                                key: 'name',
                                label: 'IANA identifier',
                                cell: (record) => (
                                    <code className="rounded bg-muted px-2 py-1 font-mono text-sm break-all">
                                        {record.name}
                                    </code>
                                ),
                                span: 'full',
                            },
                        ],
                    },
                    {
                        key: 'status',
                        title: 'Record status',
                        description:
                            'The lifecycle state used to keep this record available or retained for audit.',
                        content: (
                            <div className="space-y-4">
                                <RecordStatusSwitch
                                    recordStatus={timezone.recordStatus}
                                    label={timezone.name}
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {isCurrent
                                        ? 'This timezone is currently used by System Settings.'
                                        : timezone.recordStatus === 1
                                          ? 'This identifier is available to System Settings.'
                                          : 'This identifier is retained for audit but excluded from active selections.'}
                                </p>
                            </div>
                        ),
                    },
                    {
                        key: 'audit',
                        title: 'Audit history',
                        description:
                            'The standard lifecycle and actor fields for this record.',
                        columns: [
                            {
                                key: 'createdAt',
                                label: 'Created at',
                                cell: (record) => formatDate(record.createdAt),
                                span: 1,
                            },
                            {
                                key: 'createdBy',
                                label: 'Created by',
                                cell: (record) => actorLabel(record.createdBy),
                                span: 1,
                            },
                            {
                                key: 'updatedAt',
                                label: 'Last updated',
                                cell: (record) => formatDate(record.updatedAt),
                                span: 1,
                            },
                            {
                                key: 'updatedBy',
                                label: 'Updated by',
                                cell: (record) => actorLabel(record.updatedBy),
                                span: 1,
                            },
                            {
                                key: 'recordStatus',
                                label: 'Record status',
                                cell: (record) =>
                                    record.recordStatus === 1
                                        ? 'Active record'
                                        : 'Deleted record',
                                span: 1,
                            },
                        ],
                    },
                ]}
            />
        </DetailsPage>
    );
}

TimezoneShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Timezones', href: timezonesIndex() },
        { title: 'Timezone details', href: timezonesIndex() },
    ],
};
