import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { AuditFilterFields } from '@/components/audit-filter-fields';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { registrationTableColumns } from '@/features/access/user-table-model';
import type { Registration } from '@/features/access/user-table-model';
import { auditFilterCount, auditFilterQuery } from '@/types/audit';
import type { AuditTableFilters } from '@/types/audit';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

export default function RegistrationsPage({
    registrations,
    filters = {},
}: {
    registrations: Registration[];
    filters?: AuditTableFilters;
}) {
    const tableActions = (
        <SearchFilterSheet
            action="/access/users/registrations"
            resetHref="/access/users/registrations"
            title="Filter registrations"
            description="Narrow pending registrations by their creation and update dates."
            activeFilterCount={auditFilterCount(filters)}
        >
            <AuditFilterFields
                filters={filters}
                idPrefix="registration"
                includeActors={false}
                includeRecordStatus={false}
            />
        </SearchFilterSheet>
    );

    return (
        <IndexPage
            title="Pending registrations"
            description="Review account requests before granting access to FieldOps."
            actions={
                <div className="flex flex-wrap items-center gap-2">
                    {tableActions}
                    <ActionLink href="/access/users" variant="ghost" size="sm">
                        <ArrowLeft />
                        Back to users
                    </ActionLink>
                </div>
            }
        >
            <IndexPageSection>
                {registrations.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <p className="font-medium">No pending registrations</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            New requests will appear here after someone submits
                            the public registration form.
                        </p>
                    </div>
                ) : (
                    <DataTable
                        caption="Pending user registrations"
                        className="min-w-max"
                        containerClassName="rounded-none border-0 shadow-none ring-0"
                        scrollContainerClassName="px-4"
                        data={registrations}
                        tableColumns={registrationTableColumns}
                        addDefaultColumns
                        excludeDefaultColumns={[
                            'status',
                            'created_by',
                            'updated_by',
                            'record_status',
                        ]}
                        defaultColumnSort={{
                            action: '/access/users/registrations',
                            sort: filters.sort,
                            direction: filters.direction,
                            hidden: auditFilterQuery(filters),
                        }}
                        columnVisibility={{
                            storageKey: 'access.registrations.v2',
                            defaultVisibleKeys: [
                                'applicant',
                                'status',
                                'created_at',
                                'updated_at',
                            ],
                        }}
                        getRowKey={(registration) => registration.id}
                    />
                )}
            </IndexPageSection>
        </IndexPage>
    );
}

RegistrationsPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
        { title: 'Pending registrations', href: '/access/users/registrations' },
    ],
};
