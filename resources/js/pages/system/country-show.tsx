import { Head } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import {
    DetailField,
    DetailsActionForm,
    DetailsPage,
    DetailsSection,
} from '@/components/details-page';
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
        <>
            <Head title={country.name} />
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
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                    <DetailsSection
                        title="Country definition"
                        description="The values used to identify this country in FieldOps."
                    >
                        <div className="space-y-6 p-4 sm:p-6">
                            <div className="flex items-start gap-3">
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

                            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                                <DetailField label="Country code">
                                    <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                        {country.code}
                                    </code>
                                </DetailField>
                                <DetailField label="Name">
                                    {country.name}
                                </DetailField>
                            </dl>
                        </div>
                    </DetailsSection>

                    <DetailsSection
                        title="Record status"
                        description="The lifecycle state used to keep this record available or retained for audit."
                    >
                        <div className="space-y-4 p-4 sm:p-6">
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
                    </DetailsSection>
                </div>

                <DetailsSection
                    title="Audit history"
                    description="The standard lifecycle and actor fields for this record."
                >
                    <dl className="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
                        <DetailField label="Created at">
                            {formatDate(country.createdAt)}
                        </DetailField>
                        <DetailField label="Created by">
                            {actorLabel(country.createdBy)}
                        </DetailField>
                        <DetailField label="Last updated">
                            {formatDate(country.updatedAt)}
                        </DetailField>
                        <DetailField label="Updated by">
                            {actorLabel(country.updatedBy)}
                        </DetailField>
                        <DetailField label="Record status">
                            {country.recordStatus === 1
                                ? 'Active record'
                                : 'Deleted record'}
                        </DetailField>
                    </dl>
                </DetailsSection>
            </DetailsPage>
        </>
    );
}

CountryShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Countries', href: countriesIndex() },
        { title: 'Country details', href: countriesIndex() },
    ],
};
