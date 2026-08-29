import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import { DataTable } from '@/components/ui/data-table';
import { registrationTableColumns } from '@/features/access/user-table-model';
import type { Registration } from '@/features/access/user-table-model';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

export default function RegistrationsPage({
    registrations,
}: {
    registrations: Registration[];
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
                        className="min-w-[720px]"
                        containerClassName="rounded-none border-0 shadow-none ring-0"
                        scrollContainerClassName="px-4"
                        data={registrations}
                        tableColumns={registrationTableColumns}
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
