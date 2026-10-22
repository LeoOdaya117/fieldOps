import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import RoleForm from '@/features/access/components/role-form';
import type {
    EditableRole,
    RoleNavigationItem,
    RolePermission,
    RolePreset,
    RoleRouteOption,
} from '@/features/access/components/role-form';
import type { NavigationIconKey } from '@/types';
import { dashboard } from '@/routes';
import { index as rolesIndex } from '@/routes/access/roles';

export default function RoleEditPage({
    role,
    permissions,
    rolePresets,
    navigationItems,
    customNavigationIconKeys,
    routeOptions,
}: {
    role: EditableRole;
    permissions?: RolePermission[];
    rolePresets?: RolePreset[];
    navigationItems: RoleNavigationItem[];
    customNavigationIconKeys?: NavigationIconKey[];
    routeOptions: RoleRouteOption[];
}) {
    return (
        <>
            <Head title={`Edit ${role.displayName}`} />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div>
                    <ActionLink href="/access/roles" variant="ghost" size="sm">
                        <ArrowLeft />
                        Back to roles
                    </ActionLink>
                </div>
                <Heading
                    title={`Edit ${role.displayName}`}
                    description="Update the role definition and review its permission scope."
                />
                <RoleForm
                    action={`/access/roles/${role.id}`}
                    method="patch"
                    permissions={permissions ?? []}
                    rolePresets={rolePresets}
                    navigationItems={navigationItems}
                    customNavigationIconKeys={customNavigationIconKeys}
                    routeOptions={routeOptions}
                    role={role}
                    submitLabel="Save changes"
                />
            </div>
        </>
    );
}

RoleEditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Roles', href: rolesIndex() },
        { title: 'Edit role', href: '/access/roles' },
    ],
};
