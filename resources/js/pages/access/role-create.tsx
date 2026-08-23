import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import RoleForm from '@/features/access/components/role-form';
import type { RolePermission } from '@/features/access/components/role-form';
import { dashboard } from '@/routes';
import { index as rolesIndex } from '@/routes/access/roles';

export default function RoleCreatePage({
    permissions,
}: {
    permissions?: RolePermission[];
}) {
    return (
        <>
            <Head title="Create role" />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div>
                    <ActionLink href="/access/roles" variant="ghost" size="sm">
                        <ArrowLeft />
                        Back to roles
                    </ActionLink>
                </div>
                <Heading
                    title="Create custom role"
                    description="Build a least-privilege role for a specific team or responsibility."
                />
                <RoleForm
                    action="/access/roles"
                    method="post"
                    permissions={permissions ?? []}
                    submitLabel="Create role"
                />
            </div>
        </>
    );
}

RoleCreatePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Roles', href: rolesIndex() },
        { title: 'Create role', href: '/access/roles/create' },
    ],
};
