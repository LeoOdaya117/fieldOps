import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import { DataTable } from '@/components/ui/data-table';
import { registrationTableColumns } from '@/features/access/user-table-model';
import type { Registration } from '@/features/access/user-table-model';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

type RegistrationTableFilters = {
    sort?: string;
    direction?: 'asc' | 'desc';
};

export default function RegistrationsPage({
    registrations,
    filters = {},
}: {
    registrations: Registration[];
    filters?: RegistrationTableFilters;
}) {
    return (
        <IndexPage
            title="Pending registrations"
            description="Review account requests before granting access to FieldOps."
            actions={
                <ActionLink href="/access/users" variant="ghost" size="sm">
                    <ArrowLeft />
                    Back to users
                </ActionLink>
            }
        >
            <IndexPageSection>
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
                    }}
                    exportOptions={{
                        dataset: 'registrations',
                        permissionNamespaces: ['users'],
                        requiredPermissions: ['users.review_registrations'],
                        filters: {
                            sort: filters.sort,
                            direction: filters.direction,
                        },
                    }}
                    emptyState={
                        <div className="py-4">
                            <p className="font-medium">
                                No pending registrations
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                New requests will appear here after someone
                                submits the public registration form.
                            </p>
                        </div>
                    }
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
