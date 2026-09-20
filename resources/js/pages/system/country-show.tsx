import { Pencil, Trash2 } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { DetailsActionForm, DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import {
    RecordStatusSwitch,
    formatDate,
} from '@/features/system/reference-data-table-model';
import type { AuditActor, Country } from '@/features/system/types';
import { dashboard } from '@/routes';
import {
    destroy as deleteCountry,
    edit as editCountry,
    index as countriesIndex,
} from '@/routes/system/countries';

function actorLabel(actor: AuditActor): string {
    return actor ? `${actor.name} (${actor.email})` : 'System seed';
}

export default function CountryShowPage({
    country,
    canEdit = false,
    canDelete = false,
}: {
    country: Country;
    canEdit?: boolean;
    canDelete?: boolean;
}) {
    return (
        <DetailsPage
            title={country.name}
            description="Review the country code, record status, and audit history."
            backHref={countriesIndex.url()}
            backLabel="Back to countries"
            actions={
                <>
                    {canEdit ? (
                        <ActionLink href={editCountry.url(country.id)}>
                            <Pencil />
                            Edit
                        </ActionLink>
                    ) : null}
                    {canDelete ? (
                        <DetailsActionForm
                            action={deleteCountry.url(country.id)}
                            method="delete"
                            destructive
                            confirmation={{
                                title: `Delete ${country.name}?`,
                                description:
                                    'This will soft-delete the country and keep its audit history.',
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
                record={country}
                summary={
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-link/10 text-link">
                            <span className="font-mono text-sm font-bold">
                                {country.code}
                            </span>
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold">
                                {country.name}
                            </h2>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                                ISO alpha-2: {country.code}
                            </p>
                        </div>
                    </div>
                }
                sections={[
                    {
                        key: 'definition',
                        title: 'Country definition',
                        description:
                            'The values used to identify this country in FieldOps.',
                        columns: [
                            {
                                key: 'code',
                                label: 'Country code',
                                cell: (record) => (
                                    <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                        {record.code}
                                    </code>
                                ),
                            },
                            {
                                key: 'name',
                                label: 'Name',
                                accessor: 'name',
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
                                    recordStatus={country.recordStatus}
                                    label={country.name}
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {country.recordStatus === 1
                                        ? 'This country is available to data-entry lists.'
                                        : 'This country is retained for audit but excluded from active lists.'}
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

CountryShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Countries', href: countriesIndex() },
        { title: 'Country details', href: countriesIndex() },
    ],
};
