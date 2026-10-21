import type { FormEventHandler, FormHTMLAttributes, ReactNode } from 'react';
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

type FormProps = FormHTMLAttributes<HTMLFormElement> & {
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
    transform?: (data: Record<string, unknown>) => Record<string, unknown>;
    children?:
        | ReactNode
        | ((state: {
              processing: boolean;
              errors: Record<string, string>;
          }) => ReactNode);
};

const formMock = vi.hoisted(() => ({
    errors: {} as Record<string, string>,
    submittedData: undefined as Record<string, unknown> | undefined,
}));

const roleNavigationItems = [
    {
        key: 'notifications',
        title: 'Notifications',
        group: 'Platform',
        href: '/notifications',
        permission: null,
        iconKey: 'bell',
        superAdminOnly: false,
    },
    {
        key: 'dashboard',
        title: 'Dashboard',
        group: 'Platform',
        href: '/dashboard',
        permission: 'dashboard.view',
        iconKey: 'layoutGrid',
        superAdminOnly: false,
    },
    {
        key: 'users',
        title: 'Users',
        group: 'Access',
        href: '/access/users',
        permission: 'users.view',
        iconKey: 'users',
        superAdminOnly: false,
    },
    {
        key: 'roles',
        title: 'Roles',
        group: 'Access',
        href: '/access/roles',
        permission: 'roles.view',
        iconKey: 'shieldCheck',
        superAdminOnly: false,
    },
];

const roleRouteOptions = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'users.index', path: '/access/users' },
    { name: 'reports.index', path: '/reports' },
];

vi.mock('@inertiajs/react', () => ({
    Form: ({
        children,
        onSuccess,
        onError,
        onSubmit,
        transform,
        ...props
    }: FormProps) => {
        const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
            onSubmit?.(event);

            const data: Record<string, unknown> = {};

            for (const [field, value] of new FormData(
                event.currentTarget,
            ).entries()) {
                const isArray = field.endsWith('[]');
                const key = isArray ? field.slice(0, -2) : field;

                if (isArray) {
                    const current = data[key];
                    data[key] = Array.isArray(current)
                        ? [...current, value]
                        : [value];
                } else {
                    data[key] = value;
                }
            }

            formMock.submittedData = transform ? transform(data) : data;

            if (!event.defaultPrevented) {
                if (Object.keys(formMock.errors).length > 0) {
                    onError?.(formMock.errors);
                } else {
                    onSuccess?.();
                }
            }

            event.preventDefault();
        };

        return (
            <form {...props} onSubmit={handleSubmit}>
                {typeof children === 'function'
                    ? children({ processing: false, errors: formMock.errors })
                    : children}
            </form>
        );
    },
    Head: () => null,
    usePage: () => ({
        props: { auth: { authorization: { permissions: [] } } },
    }),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children?: ReactNode;
    }) => (
        <a href={href} data-inertia-link="true" {...props}>
            {children}
        </a>
    ),
}));

import { NavigationLink } from '@/components/navigation-link';
import AuditPage from '@/pages/access/audit';
import AuditShowPage from '@/pages/access/audit-show';
import IpBlockEditPage from '@/pages/access/ip-block-edit';
import IpBlocksPage from '@/pages/access/ip-blocks';
import IpBlockShowPage from '@/pages/access/ip-block-show';
import RoleCreatePage from '@/pages/access/role-create';
import RoleEditPage from '@/pages/access/role-edit';
import RoleShowPage from '@/pages/access/role-show';
import RolesPage from '@/pages/access/roles';
import RegistrationReviewPage from '@/pages/access/registration-review';
import RegistrationsPage from '@/pages/access/registrations';
import UserCreatePage from '@/pages/access/user-create';
import UserEditPage from '@/pages/access/user-edit';
import UserInvitePage from '@/pages/access/user-invite';
import UserShowPage from '@/pages/access/user-show';
import UsersPage from '@/pages/access/users';
import VisitLogShowPage from '@/pages/access/visit-log-show';
import VisitLogsPage from '@/pages/access/visit-logs';
import RegisterPage from '@/pages/auth/register';

afterEach(() => {
    cleanup();
    localStorage.clear();
    formMock.errors = {};
    formMock.submittedData = undefined;
});

describe('access administration pages', () => {
    it('provides consistent breadcrumbs across access pages', () => {
        expect(RolesPage.layout.breadcrumbs.map((item) => item.title)).toEqual([
            'Dashboard',
            'Roles',
        ]);
        expect(UsersPage.layout.breadcrumbs.map((item) => item.title)).toEqual([
            'Dashboard',
            'Users',
        ]);
        expect(AuditPage.layout.breadcrumbs.map((item) => item.title)).toEqual([
            'Dashboard',
            'Access audit',
        ]);
        expect(
            RoleCreatePage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Roles', 'Create role']);
        expect(
            RoleEditPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Roles', 'Edit role']);
        expect(
            UserCreatePage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Users', 'Add user']);
        expect(
            UserEditPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Users', 'Edit user']);
        expect(
            UserInvitePage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Users', 'Invite user']);
        expect(
            IpBlockEditPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'IP addresses', 'Edit IP address']);
        expect(
            UserShowPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Users', 'User details']);
        expect(
            RoleShowPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Roles', 'Role details']);
        expect(
            IpBlockShowPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'IP addresses', 'IP details']);
        expect(
            VisitLogShowPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Visit logs', 'Log details']);
        expect(
            AuditShowPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Access audit', 'Event details']);
    });

    it('renders users, invitations, roles, and safe account actions', async () => {
        const user = userEvent.setup();
        render(
            <UsersPage
                users={{
                    data: [
                        {
                            id: 1,
                            name: 'Alex',
                            email: 'alex@example.com',
                            position: null,
                            department: null,
                            avatar: null,
                            status: 'active',
                            role: {
                                id: 1,
                                name: 'technician',
                                displayName: 'Technician',
                                isSystem: true,
                            },
                            canDelete: true,
                            createdAt: null,
                        },
                    ],
                    current_page: 1,
                    last_page: 1,
                    total: 1,
                    from: 1,
                    to: 1,
                }}
                invitations={[
                    {
                        id: 2,
                        email: 'new@example.com',
                        role: {
                            id: 1,
                            name: 'technician',
                            displayName: 'Technician',
                        },
                        expiresAt: '2030-01-01T00:00:00Z',
                    },
                ]}
                registrations={[
                    {
                        id: 3,
                        name: 'Pending applicant',
                        email: 'pending@example.com',
                        status: 'pending',
                        createdAt: '2030-01-01T00:00:00Z',
                    },
                ]}
                canReviewRegistrations
                activeUsersCount={1}
                roles={[
                    {
                        id: 1,
                        name: 'technician',
                        display_name: 'Technician',
                        is_system: true,
                    },
                ]}
                filters={{ search: '', status: '' }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Users' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Filter/ })).toHaveLength(
            1,
        );
        await user.click(screen.getAllByRole('button', { name: /Filter/ })[0]);
        expect(screen.getByLabelText('Date range')).toBeInTheDocument();
        expect(screen.queryByLabelText('Created by')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Updated by')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('group', { name: 'Record status' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByLabelText('Updated date range'),
        ).not.toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(screen.getByRole('link', { name: 'Add user' })).toHaveAttribute(
            'href',
            '/access/users/create',
        );
        expect(
            screen.getByRole('link', { name: 'Invite user' }),
        ).toHaveAttribute('href', '/access/users/invite');
        expect(
            screen.getByRole('status', {
                name: '1 pending registrations',
            }),
        ).toHaveTextContent('1');
        expect(
            screen.getByRole('status', {
                name: '1 pending invitations',
            }),
        ).toHaveTextContent('1');
        expect(
            screen.getByRole('status', { name: '1 active users' }),
        ).toHaveTextContent('1');
        expect(
            screen.queryByText('pending@example.com'),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Review all' }),
        ).toHaveAttribute('href', '/access/users/registrations');
        expect(screen.getAllByRole('table')).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: 'Columns' })).toHaveLength(
            2,
        );
        const userTable = screen.getByRole('table', {
            name: 'FieldOps user accounts',
        });
        const userTableContainer = userTable.closest(
            '[data-slot="data-table-container"]',
        ) as HTMLElement;

        expect(
            within(userTableContainer).getByRole('button', {
                name: /Filter/,
            }),
        ).toBeInTheDocument();
        expect(
            within(userTableContainer).getByRole('link', {
                name: 'Add user',
            }),
        ).toHaveAttribute('href', '/access/users/create');
        expect(
            within(userTableContainer).getByRole('link', {
                name: 'Manage roles',
            }),
        ).toHaveAttribute('href', '/access/roles');
        expect(
            within(userTable).getByRole('columnheader', {
                name: /^Sort Updated ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(userTable).getAllByRole('columnheader', { name: /Status/ }),
        ).toHaveLength(1);
        expect(
            within(userTable).getByRole('columnheader', {
                name: /^Sort Created by ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(userTable).getByRole('columnheader', {
                name: /^Sort Updated by ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(userTable).getByRole('columnheader', {
                name: /^Sort Record status ascending$/,
            }),
        ).toBeInTheDocument();

        await user.click(
            within(userTableContainer).getByRole('button', {
                name: 'Columns',
            }),
        );
        await user.click(
            screen.getByRole('menuitemcheckbox', { name: 'Created' }),
        );
        await user.keyboard('{Escape}');
        expect(
            within(userTable).queryByRole('columnheader', { name: 'Created' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('checkbox', { name: 'Select Alex' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Actions for Alex' }),
        ).toBeInTheDocument();
        expect(
            localStorage.getItem('fieldops:data-table-columns:access.users.v2'),
        ).toContain('user');

        const invitationTable = screen.getByRole('table', {
            name: 'Pending user invitations',
        });
        const invitationTableContainer = invitationTable.closest(
            '[data-slot="data-table-container"]',
        ) as HTMLElement;

        expect(
            within(invitationTable).getByRole('columnheader', {
                name: /^Sort Created ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(invitationTable).getByRole('columnheader', {
                name: /^Sort Updated ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(invitationTable).getByRole('columnheader', {
                name: /^Sort Created by ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(invitationTable).getByRole('link', {
                name: 'Sort Created by ascending',
            }),
        ).toHaveAttribute(
            'href',
            '/access/users?invitation_sort=created_by&invitation_direction=asc',
        );
        expect(
            within(invitationTable).getByRole('columnheader', {
                name: /^Sort Updated by ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(invitationTable).getByRole('columnheader', {
                name: /^Sort Status ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(invitationTable).getByRole('columnheader', {
                name: /^Sort Record status ascending$/,
            }),
        ).toBeInTheDocument();

        await user.click(
            within(invitationTableContainer).getByRole('button', {
                name: 'Columns',
            }),
        );
        expect(
            screen.getByRole('menuitemcheckbox', { name: 'Expires' }),
        ).toBeInTheDocument();
        expect(
            localStorage.getItem(
                'fieldops:data-table-columns:access.invitations.v2',
            ),
        ).toContain('email');
        await user.keyboard('{Escape}');

        await user.click(screen.getByRole('checkbox', { name: 'Select Alex' }));
        expect(screen.getByText('1 selected')).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="bulk-actions-row"]'),
        ).toBeInTheDocument();
        const userManageColumns = within(userTableContainer).getByRole(
            'button',
            { name: 'Columns' },
        );
        const userBulkActions = within(userTableContainer).getByRole('button', {
            name: 'Bulk actions',
        });
        expect(
            userManageColumns.closest('[data-slot="data-table-toolbar"]'),
        ).toBe(userBulkActions.closest('[data-slot="data-table-toolbar"]'));
        await user.click(
            screen.getByRole('button', { name: 'Clear selected rows' }),
        );
        expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
        await user.click(screen.getByRole('checkbox', { name: 'Select Alex' }));
        await user.click(screen.getByRole('button', { name: 'Bulk actions' }));
        await user.click(
            screen.getByRole('menuitem', { name: 'Unblock selected' }),
        );
        expect(screen.getByRole('dialog')).toHaveTextContent(
            'Unblock 1 selected user(s)?',
        );
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        fireEvent.submit(
            document.querySelector(
                'form[action="/access/users/bulk/reactivate"]',
            ) as HTMLFormElement,
        );
        expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
        expect(
            screen.getByRole('checkbox', { name: 'Select Alex' }),
        ).not.toBeChecked();
        expect(
            screen.getAllByRole('navigation', { name: /table pagination/i }),
        ).toHaveLength(2);
        expect(screen.getByText('new@example.com')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Actions for Alex' }),
        );
        expect(
            screen.queryByRole('button', { name: 'Block' }),
        ).not.toBeInTheDocument();
        const blockAction = screen.getByRole('menuitem', { name: 'Block' });

        expect(blockAction).toBeInTheDocument();
        expect(blockAction.querySelector('svg')).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/access/users/1/edit',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Delete' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'View' })).toHaveAttribute(
            'href',
            '/access/users/1',
        );
    }, 10_000);

    it('hides create and invite actions without the corresponding permissions', () => {
        const { unmount } = render(
            <RolesPage
                roles={[]}
                canCreate={false}
                filters={{
                    search: '',
                    type: '',
                    assigned: '',
                    permissionsMin: '',
                }}
            />,
        );

        const roleTable = screen.getByRole('table', {
            name: 'FieldOps role catalog',
        });
        const roleTableContainer = roleTable.closest(
            '[data-slot="data-table-container"]',
        ) as HTMLElement;

        expect(
            within(roleTableContainer).getByRole('button', {
                name: /Filter/,
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Create role' }),
        ).not.toBeInTheDocument();

        unmount();

        render(
            <UsersPage
                users={{
                    data: [],
                    current_page: 1,
                    last_page: 1,
                    total: 0,
                    from: null,
                    to: null,
                }}
                invitations={[]}
                roles={[]}
                canCreate={false}
                canInvite={false}
                canEdit={false}
                canSuspend={false}
                canReactivate={false}
                filters={{ search: '', status: '' }}
            />,
        );

        const userTable = screen.getByRole('table', {
            name: 'FieldOps user accounts',
        });
        const userTableContainer = userTable.closest(
            '[data-slot="data-table-container"]',
        ) as HTMLElement;

        expect(
            within(userTableContainer).getByRole('button', {
                name: /Filter/,
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Add user' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Invite user' }),
        ).not.toBeInTheDocument();
    });

    it('renders a role catalog table with actions for custom roles', async () => {
        const user = userEvent.setup();
        render(
            <RolesPage
                roles={[
                    {
                        id: 1,
                        name: 'administrator',
                        displayName: 'Administrator',
                        description: 'Protected',
                        isSystem: true,
                        usersCount: 1,
                        permissionsCount: 1,
                    },
                    {
                        id: 2,
                        name: 'reviewer',
                        displayName: 'Reviewer',
                        description: 'Custom',
                        isSystem: false,
                        usersCount: 0,
                        permissionsCount: 0,
                    },
                ]}
            />,
        );

        expect(screen.getAllByText('Protected').length).toBeGreaterThan(0);
        expect(
            screen.getByRole('button', { name: /Filter/ }),
        ).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        await user.click(
            screen.getByRole('checkbox', { name: 'Select Reviewer' }),
        );
        expect(screen.getByText('1 selected')).toBeInTheDocument();
        const roleTable = screen.getByRole('table', {
            name: 'FieldOps role catalog',
        });
        const roleTableContainer = roleTable.closest(
            '[data-slot="data-table-container"]',
        ) as HTMLElement;
        expect(
            within(roleTableContainer)
                .getByRole('button', { name: 'Columns' })
                .closest('[data-slot="data-table-toolbar"]'),
        ).toContainElement(
            within(roleTableContainer).getByRole('button', {
                name: 'Bulk actions',
            }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Clear selected rows' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Actions for Reviewer' }),
        );
        expect(
            screen.getByRole('menuitem', { name: 'Edit Reviewer' }),
        ).toHaveAttribute('href', '/access/roles/2/edit');
        expect(screen.getByRole('menuitem', { name: 'View' })).toHaveAttribute(
            'href',
            '/access/roles/2',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Delete' }),
        ).toBeInTheDocument();
    });

    it('keeps role creation and editing on dedicated pages', async () => {
        const user = userEvent.setup();
        const permissions = [
            { id: 1, name: 'audit.view' },
            { id: 2, name: 'dashboard.view' },
            { id: 3, name: 'roles.create' },
            { id: 4, name: 'users.view' },
            { id: 5, name: 'users.view_deleted' },
            { id: 6, name: 'users.update_deleted' },
            { id: 7, name: 'roles.view_deleted' },
            { id: 8, name: 'roles.update_deleted' },
            { id: 9, name: 'countries.view_deleted' },
            { id: 10, name: 'countries.update_deleted' },
            { id: 11, name: 'timezones.view_deleted' },
            { id: 12, name: 'timezones.update_deleted' },
            { id: 13, name: 'ip_blocks.view_deleted' },
            { id: 14, name: 'ip_blocks.update_deleted' },
            { id: 15, name: 'organization_locations.view_deleted' },
            { id: 16, name: 'organization_locations.update_deleted' },
            { id: 17, name: 'media_assets.view_deleted' },
            { id: 18, name: 'media_assets.update_deleted' },
            { id: 19, name: 'countries.create' },
            { id: 20, name: 'countries.update' },
            { id: 21, name: 'countries.delete' },
            { id: 22, name: 'settings.view' },
            { id: 23, name: 'settings.update' },
            { id: 24, name: 'visit_logs.view' },
        ];
        const recordStatusResources = [
            { label: 'Users', key: 'users' },
            { label: 'Roles', key: 'roles' },
            { label: 'Countries', key: 'countries' },
            { label: 'Timezones', key: 'timezones' },
            { label: 'Ip Blocks', key: 'ip_blocks' },
            { label: 'Organization Locations', key: 'organization_locations' },
            { label: 'Media Assets', key: 'media_assets' },
        ];

        function expandAndCheckRecordStatusPermissions() {
            for (const { label, key } of recordStatusResources) {
                fireEvent.click(
                    screen.getByRole('button', {
                        name: `Expand ${label} permissions`,
                    }),
                );

                const group = screen.getByRole('region', { name: label });

                expect(
                    within(group).getByRole('checkbox', {
                        name: new RegExp(`${key}\\.view_deleted`),
                    }),
                ).toBeInTheDocument();
                expect(
                    within(group).getByRole('checkbox', {
                        name: new RegExp(`${key}\\.update_deleted`),
                    }),
                ).toBeInTheDocument();
            }
        }

        render(
            <RoleCreatePage
                permissions={permissions}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={roleNavigationItems.map(
                    (item) => item.key,
                )}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Create custom role' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create role' }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('tab', { name: 'Permissions' }));
        expect(
            screen.getByRole('heading', { name: 'Audit' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Dashboard' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Roles' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Users' }),
        ).toBeInTheDocument();
        expect(screen.getByText('roles.create')).toBeInTheDocument();
        expandAndCheckRecordStatusPermissions();
        await user.click(
            screen.getByRole('button', {
                name: 'Expand Countries permissions',
            }),
        );
        const countriesPermissions = screen.getByRole('region', {
            name: 'Countries',
        });

        for (const action of ['Create', 'Update', 'Delete']) {
            expect(
                within(countriesPermissions).getByText(action, {
                    exact: true,
                }),
            ).toBeInTheDocument();
        }

        await user.click(
            screen.getByRole('button', {
                name: 'Expand Settings permissions',
            }),
        );
        const settingsPermissions = screen.getByRole('region', {
            name: 'Settings',
        });
        expect(
            within(settingsPermissions).getByText('View', { exact: true }),
        ).toBeInTheDocument();
        expect(
            within(settingsPermissions).getByText('Update', { exact: true }),
        ).toBeInTheDocument();

        cleanup();

        render(
            <RoleEditPage
                permissions={permissions}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                role={{
                    id: 2,
                    name: 'reviewer',
                    displayName: 'Reviewer',
                    description: 'Custom',
                    permissions: [
                        'dashboard.view',
                        'users.view_deleted',
                        'organization_locations.view_deleted',
                        'media_assets.update_deleted',
                    ],
                    navigationItems: ['users'],
                }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Edit Reviewer' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Save changes' }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Role details').closest('[data-slot="card"]'),
        ).toHaveClass('w-full');
        expect(
            document.querySelector('[data-slot="role-details-fields"]'),
        ).toHaveClass('items-start');
        await user.click(screen.getByRole('tab', { name: 'Permissions' }));
        expect(
            document.querySelector('[data-slot="permission-groups"]'),
        ).not.toHaveClass('lg:grid-cols-2');
        expect(
            screen.getByRole('checkbox', { name: 'Select all permissions' }),
        ).toHaveAttribute('data-state', 'indeterminate');
        expect(
            screen.getByRole('checkbox', {
                name: 'Select all Dashboard permissions',
            }),
        ).toHaveAttribute('data-state', 'checked');
        expect(
            screen.getByRole('button', { name: 'Collapse Audit permissions' }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', {
                name: 'Expand Users permissions',
            }),
        );
        expect(
            within(screen.getByRole('region', { name: 'Users' })).getByRole(
                'checkbox',
                { name: /users\.view_deleted/ },
            ),
        ).toBeChecked();
        expect(
            within(screen.getByRole('region', { name: 'Users' })).getByRole(
                'checkbox',
                { name: /users\.update_deleted/ },
            ),
        ).not.toBeChecked();
        expect(
            within(screen.getByRole('region', { name: 'Users' })).getByText(
                'View Deleted',
            ),
        ).toBeInTheDocument();
        expect(
            within(screen.getByRole('region', { name: 'Users' })).getByText(
                'Update Deleted',
            ),
        ).toBeInTheDocument();

        for (const key of [
            'audit.create',
            'audit.update',
            'audit.delete',
            'visit_logs.create',
            'visit_logs.update',
            'visit_logs.delete',
            'dashboard.create',
            'dashboard.update',
            'dashboard.delete',
        ]) {
            expect(
                screen.queryByRole('checkbox', {
                    name: new RegExp(key.replace('.', '\\.')),
                }),
            ).not.toBeInTheDocument();
        }

        await user.click(
            screen.getByRole('button', {
                name: 'Expand Organization Locations permissions',
            }),
        );
        expect(
            within(
                screen.getByRole('region', {
                    name: 'Organization Locations',
                }),
            ).getByRole('checkbox', {
                name: /organization_locations\.view_deleted/,
            }),
        ).toBeChecked();
        await user.click(
            screen.getByRole('button', {
                name: 'Expand Media Assets permissions',
            }),
        );
        expect(
            within(
                screen.getByRole('region', { name: 'Media Assets' }),
            ).getByRole('checkbox', { name: /media_assets\.update_deleted/ }),
        ).toBeChecked();

        await user.click(
            screen.getByRole('button', {
                name: 'Expand Dashboard permissions',
            }),
        );
        expect(
            screen.getByRole('button', {
                name: 'Collapse Dashboard permissions',
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', {
                name: 'Collapse Audit permissions',
            }),
        ).not.toBeInTheDocument();

        await user.click(
            screen.getByRole('checkbox', { name: 'Select all permissions' }),
        );
        expect(
            screen.getByRole('checkbox', { name: 'Select all permissions' }),
        ).toHaveAttribute('data-state', 'checked');
        expect(
            screen.getByRole('checkbox', { name: /dashboard\.view/ }),
        ).toBeChecked();

        await user.click(
            screen.getByRole('button', { name: 'Expand Roles permissions' }),
        );
        expect(
            screen.getByRole('checkbox', { name: /roles\.create/ }),
        ).toBeChecked();

        await user.click(
            screen.getByRole('checkbox', {
                name: 'Select all Roles permissions',
            }),
        );
        expect(
            screen.getByRole('checkbox', {
                name: 'Select all Roles permissions',
            }),
        ).toHaveAttribute('data-state', 'unchecked');
        expect(
            screen.getByRole('checkbox', { name: 'Select all permissions' }),
        ).toHaveAttribute('data-state', 'indeterminate');
        expect(
            screen.getByRole('checkbox', { name: /roles\.create/ }),
        ).not.toBeChecked();
    }, 10_000);

    it('separates role details, navigation, and permissions into keyboard-accessible tabs', async () => {
        const user = userEvent.setup();
        render(
            <RoleCreatePage
                permissions={[{ id: 1, name: 'roles.view' }]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={['notifications']}
            />,
        );

        const detailsTab = screen.getByRole('tab', { name: 'Details' });
        expect(detailsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByLabelText('Role key')).toBeVisible();
        expect(
            screen.queryByRole('checkbox', { name: 'Notifications' }),
        ).not.toBeInTheDocument();

        await user.type(screen.getByLabelText('Role key'), 'reviewer');
        detailsTab.focus();
        await user.keyboard('{ArrowRight}');

        const navigationTab = screen.getByRole('tab', {
            name: 'Navigation',
        });
        expect(navigationTab).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('checkbox', { name: 'Notifications' }),
        ).toBeChecked();

        await user.keyboard('{ArrowRight}');
        const permissionsTab = screen.getByRole('tab', {
            name: 'Permissions',
        });
        expect(permissionsTab).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('checkbox', { name: /roles\.view/ }),
        ).toBeInTheDocument();

        await user.keyboard('{ArrowLeft}');
        expect(navigationTab).toHaveAttribute('aria-selected', 'true');
        await user.keyboard('{ArrowLeft}');
        expect(detailsTab).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByLabelText('Role key')).toHaveValue('reviewer');
    });

    it('initializes, reorders across groups, changes, and submits navigation order', async () => {
        const user = userEvent.setup();
        render(
            <RoleCreatePage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={roleNavigationItems.map(
                    (item) => item.key,
                )}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));

        const navigation = screen.getByRole('tabpanel', {
            name: 'Navigation',
        });
        const notifications = within(navigation).getByRole('checkbox', {
            name: 'Notifications',
        });
        const dashboard = within(navigation).getByRole('checkbox', {
            name: 'Dashboard',
        });
        const users = within(navigation).getByRole('checkbox', {
            name: 'Users',
        });
        const roles = within(navigation).getByRole('checkbox', {
            name: 'Roles',
        });

        expect(notifications).toBeChecked();
        expect(dashboard).toBeChecked();
        expect(users).toBeChecked();
        expect(roles).toBeChecked();
        expect(within(navigation).getAllByRole('checkbox')).toHaveLength(
            roleNavigationItems.length,
        );
        expect(
            screen.getByText(/permissions still control access/i),
        ).toBeInTheDocument();

        const moveUsersUp = screen.getByRole('button', {
            name: 'Move Users up',
        });
        moveUsersUp.focus();
        await user.keyboard('{Enter}');
        await user.click(dashboard);
        await user.click(dashboard);
        const orderedItems = () =>
            within(
                within(navigation).getByRole('list', {
                    name: 'Navigation destinations',
                }),
            )
                .getAllByRole('listitem')
                .map((item) => item.getAttribute('aria-label'));

        expect(orderedItems()).toEqual([
            'Notifications, Platform, position 1',
            'Users, Access, position 2',
            'Roles, Access, position 3',
            'Dashboard, Platform, position 4',
        ]);
        await user.click(screen.getByRole('tab', { name: 'Details' }));
        await user.type(screen.getByLabelText('Role key'), 'reviewer');
        await user.type(screen.getByLabelText('Display name'), 'Reviewer');
        await user.click(screen.getByRole('button', { name: 'Create role' }));

        expect(formMock.submittedData?.navigation_items).toEqual([
            'notifications',
            'users',
            'roles',
            'dashboard',
        ]);

        cleanup();
        render(
            <RoleEditPage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                role={{
                    id: 2,
                    name: 'reviewer',
                    displayName: 'Reviewer',
                    description: null,
                    permissions: [],
                    navigationItems: ['users', 'notifications'],
                }}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        const editNavigation = screen.getByRole('tabpanel', {
            name: 'Navigation',
        });

        expect(
            within(editNavigation).getByRole('checkbox', { name: 'Users' }),
        ).toBeChecked();
        expect(
            within(editNavigation).getByRole('checkbox', {
                name: 'Notifications',
            }),
        ).toBeChecked();
        const orderedEditItems = () =>
            within(
                within(editNavigation).getByRole('list', {
                    name: 'Navigation destinations',
                }),
            )
                .getAllByRole('listitem')
                .map((item) => item.getAttribute('aria-label'));

        expect(orderedEditItems().slice(0, 2)).toEqual([
            'Users, Access, position 1',
            'Notifications, Platform, position 2',
        ]);
        await user.click(screen.getByRole('button', { name: 'Select all' }));
        expect(orderedEditItems()).toEqual([
            'Users, Access, position 1',
            'Notifications, Platform, position 2',
            'Dashboard, Platform, position 3',
            'Roles, Access, position 4',
        ]);
    });

    it('reorders selected destinations by dragging and submits the new order', async () => {
        const user = userEvent.setup();
        render(
            <RoleCreatePage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={roleNavigationItems.map(
                    (item) => item.key,
                )}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));

        const navigation = screen.getByRole('tabpanel', {
            name: 'Navigation',
        });
        const destinationList = within(navigation).getByRole('list', {
            name: 'Navigation destinations',
        });
        const dragHandle = within(destinationList).getByRole('button', {
            name: 'Drag Notifications to reorder',
        });
        const usersRow = within(destinationList).getByRole('listitem', {
            name: 'Users, Access, position 3',
        });
        const dataTransfer = {
            effectAllowed: 'none',
            dropEffect: 'none',
            setData: vi.fn(),
        };

        fireEvent.dragStart(dragHandle, { dataTransfer });
        fireEvent.dragOver(usersRow, {
            clientY: 100,
            dataTransfer,
        });
        fireEvent.drop(usersRow, { dataTransfer });
        fireEvent.dragEnd(dragHandle);

        expect(
            within(destinationList)
                .getAllByRole('listitem')
                .map((item) => item.getAttribute('aria-label')),
        ).toEqual([
            'Dashboard, Platform, position 1',
            'Notifications, Platform, position 2',
            'Users, Access, position 3',
            'Roles, Access, position 4',
        ]);
        expect(screen.getByText(/Notifications reordered/i)).toHaveAttribute(
            'aria-live',
            'polite',
        );

        await user.click(screen.getByRole('tab', { name: 'Details' }));
        await user.type(screen.getByLabelText('Role key'), 'reviewer');
        await user.type(screen.getByLabelText('Display name'), 'Reviewer');
        await user.click(screen.getByRole('button', { name: 'Create role' }));

        expect(formMock.submittedData?.navigation_items).toEqual([
            'dashboard',
            'notifications',
            'users',
            'roles',
        ]);
    });

    it('keeps a configured destination selected when its permission is absent', async () => {
        const user = userEvent.setup();
        render(
            <RoleEditPage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                role={{
                    id: 3,
                    name: 'dashboard_reader',
                    displayName: 'Dashboard reader',
                    description: null,
                    permissions: [],
                    navigationItems: ['dashboard'],
                    navigationGroupOverrides: { dashboard: 'Analytics' },
                }}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));

        expect(
            within(
                screen.getByRole('tabpanel', { name: 'Navigation' }),
            ).getByRole('checkbox', { name: 'Dashboard' }),
        ).toBeChecked();
        expect(
            screen.getByText(/permissions still control access/i),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Group for Dashboard')).toHaveValue(
            'Analytics',
        );
        await user.click(screen.getByRole('button', { name: 'Save changes' }));
        expect(formMock.submittedData?.navigation_group_overrides).toEqual({
            dashboard: 'Analytics',
        });
    });

    it('creates group labels, assigns them to built-in destinations, and submits overrides', async () => {
        const user = userEvent.setup();
        render(
            <RoleCreatePage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={['notifications']}
                customNavigationItems={[]}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        await user.selectOptions(
            screen.getByLabelText('Group for Notifications'),
            '__create_group__',
        );
        await user.type(
            screen.getByLabelText('New group for Notifications'),
            'Operations',
        );
        await user.click(
            screen.getByRole('button', { name: 'Add', exact: true }),
        );

        await user.click(screen.getByRole('tab', { name: 'Details' }));
        await user.type(screen.getByLabelText('Role key'), 'operations_role');
        await user.type(
            screen.getByLabelText('Display name'),
            'Operations role',
        );
        await user.click(screen.getByRole('button', { name: 'Create role' }));

        expect(formMock.submittedData?.navigation_group_overrides).toEqual({
            notifications: 'Operations',
        });
        expect(formMock.submittedData?.custom_navigation_items).toEqual([]);
    });

    it('previews draft order and permissions, then filters without changing saved order', async () => {
        const user = userEvent.setup();
        render(
            <RoleEditPage
                permissions={[
                    { id: 1, name: 'dashboard.view' },
                    { id: 2, name: 'users.view' },
                    { id: 3, name: 'roles.view' },
                ]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                role={{
                    id: 4,
                    name: 'field_viewer',
                    displayName: 'Field viewer',
                    description: null,
                    permissions: ['dashboard.view', 'users.view'],
                    navigationItems: [
                        'dashboard',
                        'users',
                        'notifications',
                        'roles',
                    ],
                }}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));

        const preview = screen.getByRole('navigation', {
            name: 'Draft sidebar',
        });
        expect(
            within(preview).getAllByRole('region', { name: 'Platform' }),
        ).toHaveLength(2);
        expect(screen.getByText('Requires roles.view')).toBeInTheDocument();
        expect(
            screen.getByRole('region', { name: 'Hidden by permissions' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('complementary', { name: 'Sidebar preview' }),
        ).toHaveClass('lg:sticky', 'bg-card', 'border-border');
        expect(
            screen.getByText('Field viewer', { selector: 'p' }),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Move Notifications up' }),
        );
        expect(
            within(preview).getAllByRole('region', { name: 'Platform' }),
        ).toHaveLength(1);
        const platformPreview = within(preview).getByRole('region', {
            name: 'Platform',
        });
        const platformPreviewItems =
            within(platformPreview).getAllByRole('listitem');
        expect(platformPreviewItems[0]).toHaveTextContent(
            /Dashboard.*\/dashboard/,
        );
        expect(platformPreviewItems[1]).toHaveTextContent(
            /Notifications.*\/notifications/,
        );
        await user.selectOptions(
            screen.getByLabelText('Group for Dashboard'),
            '__create_group__',
        );
        await user.type(
            screen.getByLabelText('New group for Dashboard'),
            'Analytics',
        );
        await user.click(
            screen.getByRole('button', { name: 'Add', exact: true }),
        );
        expect(
            within(
                within(preview).getByRole('region', { name: 'Analytics' }),
            ).getByText('Dashboard'),
        ).toBeInTheDocument();

        await user.type(screen.getByLabelText('Search destinations'), 'users');
        const searchedList = screen.getByRole('list', {
            name: 'Navigation destinations',
        });
        expect(within(searchedList).getAllByRole('listitem')).toHaveLength(1);
        expect(
            within(searchedList).getByRole('checkbox', { name: 'Users' }),
        ).toBeInTheDocument();
        await user.clear(screen.getByLabelText('Search destinations'));

        await user.click(
            screen.getByRole('button', { name: 'Available', exact: true }),
        );
        expect(
            screen.getByText('No available destinations.'),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Selected', exact: true }),
        );
        const destinationList = screen.getByRole('list', {
            name: 'Navigation destinations',
        });
        expect(
            within(destinationList)
                .getAllByRole('listitem')
                .map((item) => item.getAttribute('aria-label')),
        ).toEqual([
            'Dashboard, Analytics, position 1',
            'Notifications, Platform, position 2',
            'Users, Access, position 3',
            'Roles, Access, position 4',
        ]);
        await user.click(screen.getByRole('button', { name: 'Save changes' }));
        expect(formMock.submittedData?.navigation_items).toEqual([
            'dashboard',
            'notifications',
            'users',
            'roles',
        ]);
        expect(
            document.querySelector('[data-slot="card-footer"]') ??
                document.querySelector('footer'),
        ).toHaveClass('sticky', 'bottom-0');
    });

    it('renames groups across links and confirms role-local group removal', async () => {
        const user = userEvent.setup();
        const customKey = 'custom_123e4567-e89b-42d3-a456-426614174000';
        render(
            <RoleEditPage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                role={{
                    id: 5,
                    name: 'report_viewer',
                    displayName: 'Report viewer',
                    description: null,
                    permissions: [],
                    navigationItems: [
                        'dashboard',
                        'users',
                        'notifications',
                        customKey,
                    ],
                    navigationGroupOverrides: {
                        dashboard: 'Operations',
                        users: 'Operations',
                        roles: 'Operations',
                    },
                    customNavigationItems: [
                        {
                            key: customKey,
                            title: 'Team reports',
                            group: 'Operations',
                            url: '/reports/team',
                            iconKey: 'folder',
                        },
                    ],
                }}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        expect(screen.getByText('4 destinations')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', { name: 'Rename group Operations' }),
        );
        await user.clear(screen.getByLabelText('Rename Operations'));
        await user.type(screen.getByLabelText('Rename Operations'), 'Reports');
        await user.click(
            screen.getByRole('button', { name: 'Save', exact: true }),
        );
        expect(screen.getByLabelText('Group for Dashboard')).toHaveValue(
            'Reports',
        );
        expect(screen.getByLabelText('Group for Users')).toHaveValue('Reports');
        expect(screen.getByLabelText('Group for Roles')).toHaveValue('Reports');
        expect(
            screen.getByText('Reports', { selector: 'h4' }),
        ).toBeInTheDocument();
        const preview = screen.getByRole('navigation', {
            name: 'Draft sidebar',
        });
        const reportsGroup = within(preview).getByRole('region', {
            name: 'Reports',
        });
        expect(
            within(reportsGroup).getByText('Team reports'),
        ).toBeInTheDocument();
        expect(
            within(reportsGroup).getByText('/reports/team'),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Save changes' }));
        expect(formMock.submittedData?.navigation_group_overrides).toEqual({
            dashboard: 'Reports',
            users: 'Reports',
            roles: 'Reports',
        });
        expect(formMock.submittedData?.custom_navigation_items).toEqual([
            expect.objectContaining({ group: 'Reports' }),
        ]);

        await user.click(
            screen.getByRole('button', { name: 'Remove group Reports' }),
        );
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveTextContent(/custom links.*deselects.*built-in/i);
        await user.click(
            within(dialog).getByRole('button', { name: 'Cancel' }),
        );
        expect(
            screen.getByRole('checkbox', { name: 'Dashboard' }),
        ).toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: 'Team reports' }),
        ).toBeChecked();

        await user.click(
            screen.getByRole('button', { name: 'Remove group Reports' }),
        );
        await user.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'Remove group',
            }),
        );
        expect(
            screen.getByRole('checkbox', { name: 'Dashboard' }),
        ).not.toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: 'Users' }),
        ).not.toBeChecked();
        expect(
            screen.getByRole('checkbox', { name: 'Notifications' }),
        ).toBeChecked();
        expect(
            screen.queryByRole('checkbox', { name: 'Team reports' }),
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Save changes' }));
        expect(formMock.submittedData?.navigation_items).toEqual([
            'notifications',
        ]);
        expect(formMock.submittedData?.custom_navigation_items).toEqual([]);
        expect(formMock.submittedData?.navigation_group_overrides).toEqual({});
    });

    it('selects an available destination and reorders it in the saved global order', async () => {
        const user = userEvent.setup();
        render(
            <RoleEditPage
                permissions={[
                    { id: 1, name: 'dashboard.view' },
                    { id: 2, name: 'users.view' },
                    { id: 3, name: 'roles.view' },
                ]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                role={{
                    id: 6,
                    name: 'field_viewer',
                    displayName: 'Field viewer',
                    description: null,
                    permissions: ['dashboard.view', 'users.view'],
                    navigationItems: ['notifications', 'users'],
                }}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        await user.click(
            screen.getByRole('button', { name: 'Available', exact: true }),
        );
        const destinationList = screen.getByRole('list', {
            name: 'Navigation destinations',
        });
        expect(
            within(destinationList).getByRole('checkbox', { name: 'Roles' }),
        ).not.toBeChecked();
        await user.click(
            within(destinationList).getByRole('checkbox', { name: 'Roles' }),
        );

        await user.click(
            screen.getByRole('button', { name: 'Selected', exact: true }),
        );
        await user.click(screen.getByRole('button', { name: 'Move Roles up' }));
        expect(
            within(destinationList)
                .getAllByRole('listitem')
                .map((item) => item.getAttribute('aria-label')),
        ).toEqual([
            'Notifications, Platform, position 1',
            'Roles, Access, position 2',
            'Users, Access, position 3',
        ]);

        await user.click(screen.getByRole('button', { name: 'Save changes' }));
        expect(formMock.submittedData?.navigation_items).toEqual([
            'notifications',
            'roles',
            'users',
        ]);
    });

    it('updates the preview from draft permissions and Super Admin identity', async () => {
        const user = userEvent.setup();
        const backupItem = {
            key: 'backups',
            title: 'Backup & Restore',
            group: 'System',
            href: '/system-settings/backups',
            permission: 'system_settings.manage_system',
            iconKey: 'databaseBackup',
            superAdminOnly: true,
        };
        render(
            <RoleEditPage
                permissions={[
                    { id: 1, name: 'dashboard.view' },
                    { id: 2, name: 'system_settings.manage_system' },
                ]}
                navigationItems={[...roleNavigationItems, backupItem]}
                routeOptions={roleRouteOptions}
                role={{
                    id: 7,
                    name: 'super_admin',
                    displayName: 'Super Admin',
                    description: null,
                    permissions: ['dashboard.view'],
                    navigationItems: ['dashboard', 'backups'],
                }}
            />,
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));

        let preview = screen.getByRole('navigation', {
            name: 'Draft sidebar',
        });
        expect(
            screen.getByRole('region', { name: 'Hidden by permissions' }),
        ).toHaveTextContent('Requires system_settings.manage_system');
        expect(within(preview).queryByText('Backup & Restore')).toBeNull();

        await user.click(screen.getByRole('tab', { name: 'Permissions' }));
        await user.click(
            screen.getByRole('checkbox', { name: 'Select all permissions' }),
        );
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        preview = screen.getByRole('navigation', { name: 'Draft sidebar' });
        expect(
            within(preview).getByText('Backup & Restore'),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('region', { name: 'Hidden by permissions' }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Details' }));
        await user.clear(screen.getByLabelText('Role key'));
        await user.type(screen.getByLabelText('Role key'), 'field_viewer');
        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        preview = screen.getByRole('navigation', { name: 'Draft sidebar' });
        expect(within(preview).queryByText('Backup & Restore')).toBeNull();
        expect(
            screen.getByRole('region', { name: 'Hidden by permissions' }),
        ).toHaveTextContent('Super Admin only');
    });

    it('adds, edits, orders, and submits role-specific custom destinations', async () => {
        const user = userEvent.setup();
        render(
            <RoleCreatePage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={['notifications']}
                customNavigationItems={[]}
                customNavigationIconKeys={[
                    'link',
                    'activity',
                    'map',
                    'building',
                ]}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        await user.click(
            screen.getByRole('button', { name: 'Add destination' }),
        );
        expect(screen.getByLabelText('Destination title')).toHaveFocus();
        const urlInput = screen.getByLabelText('URL');
        expect(urlInput).toHaveAttribute('role', 'combobox');
        await user.type(urlInput, 'reports');
        expect(
            screen.getByRole('option', {
                name: /reports\.index \/reports/i,
            }),
        ).toBeInTheDocument();
        await user.keyboard('{ArrowDown}{Enter}');
        expect(urlInput).toHaveValue('/reports');
        await user.click(screen.getByRole('button', { name: 'Cancel draft' }));
        expect(
            screen.getByRole('button', { name: 'Add destination' }),
        ).toHaveFocus();
        await user.click(
            screen.getByRole('button', { name: 'Add destination' }),
        );
        expect(screen.getByLabelText('Destination title')).toHaveFocus();
        await user.type(
            screen.getByLabelText('Destination title'),
            'Regional reports',
        );
        await user.selectOptions(
            screen.getByLabelText('Group label'),
            '__create_group__',
        );
        await user.type(screen.getByLabelText('New group label'), 'Operations');
        await user.click(
            screen.getByRole('button', { name: 'Add', exact: true }),
        );
        await user.type(
            screen.getByLabelText('URL'),
            '/reports/region?period=month',
        );
        await user.selectOptions(screen.getByLabelText('Icon'), 'activity');
        expect(screen.getByText('Regional reports')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Add to navigation' }),
        );
        expect(
            screen.getByRole('button', { name: 'Add destination' }),
        ).toHaveFocus();

        const customCheckbox = screen.getByRole('checkbox', {
            name: 'Regional reports',
        });
        expect(customCheckbox).toBeChecked();
        await user.click(
            screen.getByRole('button', { name: 'Move Regional reports up' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Edit Regional reports' }),
        );
        expect(screen.getByLabelText('Destination title')).toHaveFocus();
        await user.clear(screen.getByLabelText('Destination title'));
        await user.type(
            screen.getByLabelText('Destination title'),
            'Regional dashboard',
        );
        await user.selectOptions(
            screen.getByLabelText('Group label'),
            '__create_group__',
        );
        await user.type(screen.getByLabelText('New group label'), 'Analytics');
        await user.click(
            screen.getByRole('button', { name: 'Add', exact: true }),
        );
        await user.clear(screen.getByLabelText('URL'));
        await user.type(
            screen.getByLabelText('URL'),
            'https://reports.example.test/region',
        );
        await user.selectOptions(screen.getByLabelText('Icon'), 'map');
        const preview = screen.getByRole('navigation', {
            name: 'Draft sidebar',
        });
        expect(
            within(preview).getByRole('region', { name: 'Analytics' }),
        ).toBeInTheDocument();
        expect(
            within(preview).getByText('Regional dashboard'),
        ).toBeInTheDocument();
        expect(
            within(preview).getByText('https://reports.example.test/region'),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Done editing' }));
        expect(
            screen.getByRole('button', { name: 'Edit Regional dashboard' }),
        ).toHaveFocus();

        await user.type(screen.getByLabelText('Role key'), 'regional_manager');
        await user.type(
            screen.getByLabelText('Display name'),
            'Regional manager',
        );
        await user.click(screen.getByRole('button', { name: 'Create role' }));

        const customItems = formMock.submittedData?.custom_navigation_items as {
            key: string;
            title: string;
            group: string;
            url: string;
            iconKey: string;
        }[];
        const customKey = customItems[0]?.key;

        expect(customKey).toMatch(/^custom_[0-9a-f-]{36}$/i);
        expect(customItems).toEqual([
            {
                key: customKey,
                title: 'Regional dashboard',
                group: 'Analytics',
                url: 'https://reports.example.test/region',
                iconKey: 'map',
            },
        ]);
        expect(formMock.submittedData?.navigation_items).toEqual([
            customKey,
            'notifications',
        ]);
        expect(formMock.submittedData?.navigation_group_overrides).toEqual({});
    }, 15000);

    it('removes a custom destination from both the ordered selection and submitted metadata', async () => {
        const user = userEvent.setup();
        render(
            <RoleEditPage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                customNavigationIconKeys={['link', 'folder']}
                role={{
                    id: 7,
                    name: 'report_viewer',
                    displayName: 'Report viewer',
                    description: null,
                    permissions: [],
                    navigationItems: [
                        'custom_123e4567-e89b-42d3-a456-426614174000',
                    ],
                    customNavigationItems: [
                        {
                            key: 'custom_123e4567-e89b-42d3-a456-426614174000',
                            title: 'Team reports',
                            group: 'Operations',
                            url: '/reports/team',
                            iconKey: 'folder',
                        },
                    ],
                }}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        expect(
            screen.getByRole('checkbox', { name: 'Team reports' }),
        ).toBeChecked();
        await user.click(
            screen.getByRole('button', { name: 'Remove Team reports' }),
        );
        expect(
            screen.queryByRole('checkbox', { name: 'Team reports' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Add destination' }),
        ).toHaveFocus();
        await user.click(screen.getByRole('button', { name: 'Save changes' }));

        expect(formMock.submittedData?.navigation_items).toEqual([]);
        expect(formMock.submittedData?.custom_navigation_items).toEqual([]);
    });

    it('submits a role while an empty custom destination draft is open', async () => {
        const user = userEvent.setup();
        render(
            <RoleCreatePage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={['notifications']}
                customNavigationItems={[]}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        await user.click(
            screen.getByRole('button', { name: 'Add destination' }),
        );
        expect(screen.getByLabelText('Destination title')).toHaveFocus();
        expect(screen.getByLabelText('Destination title')).not.toBeRequired();
        expect(screen.getByLabelText('Group label')).not.toBeRequired();
        expect(screen.getByLabelText('URL')).not.toBeRequired();

        await user.click(screen.getByRole('tab', { name: 'Details' }));
        await user.type(screen.getByLabelText('Role key'), 'draft_role');
        await user.type(screen.getByLabelText('Display name'), 'Draft role');
        await user.click(screen.getByRole('button', { name: 'Create role' }));

        expect(formMock.submittedData?.custom_navigation_items).toEqual([]);
        expect(formMock.submittedData?.navigation_items).toEqual([
            'notifications',
        ]);
    });

    it('associates built-in and custom group validation errors with their selectors', async () => {
        const user = userEvent.setup();
        formMock.errors = {
            'navigation_group_overrides.notifications':
                'Choose a sidebar group.',
            'custom_navigation_items.0.group':
                'Choose a custom destination group.',
        };

        render(
            <RoleEditPage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                customNavigationIconKeys={['link', 'folder']}
                role={{
                    id: 7,
                    name: 'report_viewer',
                    displayName: 'Report viewer',
                    description: null,
                    permissions: [],
                    navigationItems: [
                        'notifications',
                        'custom_123e4567-e89b-42d3-a456-426614174000',
                    ],
                    navigationGroupOverrides: {},
                    customNavigationItems: [
                        {
                            key: 'custom_123e4567-e89b-42d3-a456-426614174000',
                            title: 'Team reports',
                            group: 'Operations',
                            url: '/reports/team',
                            iconKey: 'folder',
                        },
                    ],
                }}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        await user.click(screen.getByRole('button', { name: 'Save changes' }));

        const builtInGroup = screen.getByLabelText('Group for Notifications');
        const customGroup = screen.getByLabelText('Group for Team reports');

        expect(builtInGroup).toHaveAttribute('aria-invalid', 'true');
        expect(customGroup).toHaveAttribute('aria-invalid', 'true');
        expect(builtInGroup).toHaveAccessibleDescription(
            'Choose a sidebar group.',
        );
        expect(customGroup).toHaveAccessibleDescription(
            'Choose a custom destination group.',
        );
    });

    it('uses Inertia links for app paths and same-tab anchors for HTTPS destinations', () => {
        render(
            <div>
                <NavigationLink href="/reports">Reports</NavigationLink>
                <NavigationLink href="https://example.test/reports">
                    External reports
                </NavigationLink>
            </div>,
        );

        expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute(
            'data-inertia-link',
            'true',
        );
        const external = screen.getByRole('link', {
            name: 'External reports',
        });
        expect(external).toHaveAttribute(
            'href',
            'https://example.test/reports',
        );
        expect(external).not.toHaveAttribute('data-inertia-link');
        expect(external).not.toHaveAttribute('target');
    });

    it('submits an explicit empty role navigation selection and announces validation errors', async () => {
        const user = userEvent.setup();
        render(
            <RoleCreatePage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={roleNavigationItems.map(
                    (item) => item.key,
                )}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Navigation' }));
        await user.click(screen.getByRole('button', { name: 'Clear all' }));
        expect(
            screen
                .getByRole('tabpanel', { name: 'Navigation' })
                .querySelectorAll('input[type="checkbox"]:checked'),
        ).toHaveLength(0);
        await user.click(screen.getByRole('tab', { name: 'Details' }));
        await user.type(screen.getByLabelText('Role key'), 'empty_role');
        await user.type(screen.getByLabelText('Display name'), 'Empty role');
        await user.click(screen.getByRole('button', { name: 'Create role' }));
        expect(formMock.submittedData?.navigation_items).toEqual([]);

        cleanup();
        formMock.errors = {
            navigation_items: 'Select at least one destination.',
        };
        render(
            <RoleCreatePage
                permissions={[]}
                navigationItems={roleNavigationItems}
                routeOptions={roleRouteOptions}
                defaultNavigationItems={[]}
            />,
        );

        await user.type(screen.getByLabelText('Role key'), 'invalid_role');
        await user.type(screen.getByLabelText('Display name'), 'Invalid role');
        await user.click(screen.getByRole('button', { name: 'Create role' }));

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Select at least one destination.',
        );
        expect(
            screen.getByRole('tabpanel', { name: 'Navigation' }),
        ).toHaveAttribute('aria-invalid', 'true');
    });

    it('keeps user creation and invitations on dedicated pages', () => {
        render(
            <UserCreatePage
                roles={[
                    {
                        id: 1,
                        name: 'technician',
                        display_name: 'Technician',
                        is_system: true,
                    },
                ]}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Add a user' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create user' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Back to users' }),
        ).toHaveAttribute('href', '/access/users');

        cleanup();
        render(
            <UserInvitePage
                roles={[
                    {
                        id: 1,
                        name: 'technician',
                        display_name: 'Technician',
                        is_system: true,
                    },
                ]}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Invite a user' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Send invitation' }),
        ).toBeInTheDocument();
    });

    it('renders an editable user form with account controls', () => {
        render(
            <UserEditPage
                roles={[
                    {
                        id: 1,
                        name: 'technician',
                        display_name: 'Technician',
                        is_system: true,
                    },
                ]}
                user={{
                    id: 8,
                    name: 'Alex',
                    email: 'alex@example.com',
                    position: 'Supervisor',
                    department: 'Operations',
                    avatar: null,
                    blocked: false,
                    roleId: 1,
                }}
            />,
        );

        expect(
            screen.queryByRole('link', { name: 'Back to users' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Edit Alex' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Position')).toHaveValue('Supervisor');
        expect(screen.getByLabelText('Department')).toHaveValue('Operations');
        expect(
            screen.getByRole('combobox', { name: 'Role' }),
        ).toHaveTextContent('Technician');
        expect(document.querySelector('input[name="role_id"]')).toHaveValue(
            '1',
        );
        expect(
            screen.getByRole('heading', { name: 'Basic information' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Access and role' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Profile photo' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Password reset' }),
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText('Block sign-in access'),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Save changes' }),
        ).toBeInTheDocument();
    });

    it('renders registration submission and review states', async () => {
        const user = userEvent.setup();
        render(<RegisterPage passwordRules="Use a strong password." />);

        expect(
            screen.getByRole('button', { name: 'Submit registration' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Use a strong password.')).toBeInTheDocument();

        cleanup();
        render(
            <RegistrationsPage
                registrations={[
                    {
                        id: 4,
                        name: 'Pending applicant',
                        email: 'pending@example.com',
                        status: 'pending',
                        createdAt: '2030-01-01T00:00:00Z',
                    },
                ]}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Pending registrations' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /Filter/ }),
        ).not.toBeInTheDocument();
        expect(screen.getByText('pending@example.com')).toBeInTheDocument();
        const registrationsTable = screen.getByRole('table', {
            name: 'Pending user registrations',
        });
        expect(
            within(registrationsTable).getByRole('columnheader', {
                name: /^Sort Created ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(registrationsTable).getByRole('columnheader', {
                name: /^Sort Updated ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(registrationsTable).getAllByRole('columnheader', {
                name: 'Status',
            }),
        ).toHaveLength(1);
        expect(
            within(registrationsTable).queryByRole('columnheader', {
                name: 'Created by',
            }),
        ).not.toBeInTheDocument();
        expect(
            within(registrationsTable).queryByRole('columnheader', {
                name: 'Record status',
            }),
        ).not.toBeInTheDocument();
        await user.click(
            screen.getByRole('button', {
                name: 'Actions for Pending applicant',
            }),
        );
        expect(
            screen.getByRole('menuitem', { name: 'Review' }),
        ).toHaveAttribute('href', '/access/users/registrations/4');

        cleanup();
        render(
            <RegistrationReviewPage
                registration={{
                    id: 4,
                    name: 'Pending applicant',
                    email: 'pending@example.com',
                    status: 'pending',
                    createdAt: '2030-01-01T00:00:00Z',
                }}
                roles={[
                    {
                        id: 1,
                        name: 'technician',
                        display_name: 'Technician',
                        is_system: true,
                    },
                ]}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Approve registration' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Reject registration' }),
        ).toBeInTheDocument();
    });

    it('shows system role actions to Super Admins', async () => {
        const user = userEvent.setup();
        render(
            <RolesPage
                canManageSystemRoles
                roles={[
                    {
                        id: 1,
                        name: 'super_admin',
                        displayName: 'Super Admin',
                        description: 'Full access',
                        isSystem: true,
                        usersCount: 1,
                        permissionsCount: 11,
                    },
                ]}
            />,
        );

        expect(screen.queryByText('Role catalog')).not.toBeInTheDocument();
        expect(screen.queryByText('1 visible')).not.toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="index-page-toolbar"]'),
        ).not.toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="data-table-scroll-container"]'),
        ).toHaveClass('px-4');
        expect(screen.getByText('System')).toBeInTheDocument();
        const roleTable = screen.getByRole('table', {
            name: 'FieldOps role catalog',
        });
        expect(
            within(roleTable).getByRole('columnheader', {
                name: /^Sort Created ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(roleTable).getByRole('columnheader', {
                name: /^Sort Updated ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(roleTable).getByRole('columnheader', {
                name: /^Sort Created by ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(roleTable).getByRole('columnheader', {
                name: /^Sort Updated by ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(roleTable).getByRole('columnheader', {
                name: /^Sort Record status ascending$/,
            }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Actions for Super Admin' }),
        );
        expect(
            screen.getByRole('menuitem', { name: 'Edit Super Admin' }),
        ).toHaveAttribute('href', '/access/roles/1/edit');
        expect(
            screen.getByRole('menuitem', { name: 'Delete' }),
        ).toBeInTheDocument();
        expect(screen.queryByText('Read-only')).not.toBeInTheDocument();
    });

    it('renders an auditable event with before and after values', async () => {
        const user = userEvent.setup();

        render(
            <AuditPage
                events={{
                    data: [
                        {
                            id: 1,
                            event: 'user.role_changed',
                            actor: {
                                id: 1,
                                name: 'Owner',
                                email: 'owner@example.com',
                            },
                            subjectType: 'App\\Models\\User',
                            subjectId: '2',
                            before: { role: 'technician' },
                            after: { role: 'supervisor' },
                            occurredAt: '2030-01-01T00:00:00Z',
                        },
                    ],
                    current_page: 1,
                    last_page: 1,
                    total: 1,
                    from: 1,
                    to: 1,
                }}
                eventTypes={['user.role_changed']}
                filters={{
                    event: '',
                    actor: '',
                    subject: '',
                    from: '',
                    to: '',
                }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Access audit' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Filter/ }),
        ).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(
            screen.getAllByRole('navigation', { name: /table pagination/i }),
        ).toHaveLength(2);
        expect(screen.getAllByText('user.role_changed').length).toBeGreaterThan(
            0,
        );
        expect(screen.getByText(/technician/)).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Actions for audit event 1' }),
        );
        expect(screen.getByRole('menuitem', { name: 'View' })).toHaveAttribute(
            'href',
            '/access/audit/1',
        );
    });

    it('renders the IP address directory with shared row actions and delete', async () => {
        const user = userEvent.setup();

        render(
            <IpBlocksPage
                blockedIpAddresses={{
                    data: [
                        {
                            id: 1,
                            ipAddress: '203.0.113.10',
                            user: {
                                id: 2,
                                name: 'Field Operator',
                                email: 'operator@example.com',
                            },
                            reason: 'Repeated abuse',
                            isActive: true,
                            blockedAt: '2030-01-01T00:00:00Z',
                            firstSeenAt: '2030-01-01T00:00:00Z',
                            lastSeenAt: '2030-01-01T01:00:00Z',
                            blockedBy: {
                                id: 1,
                                name: 'Owner',
                                email: 'owner@example.com',
                            },
                            unblockedAt: null,
                            unblockedBy: null,
                        },
                    ],
                    current_page: 1,
                    last_page: 1,
                    total: 1,
                    from: 1,
                    to: 1,
                }}
                filters={{ search: '', status: '' }}
                canUpdate
                canDelete
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Blocked IP addresses' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'IP address directory' }),
        ).not.toBeInTheDocument();
        expect(screen.getByText('203.0.113.10')).toBeInTheDocument();
        expect(screen.getByText('Field Operator')).toBeInTheDocument();
        expect(screen.getByText('operator@example.com')).toBeInTheDocument();
        expect(screen.getByText('Repeated abuse')).toBeInTheDocument();
        expect(
            screen.getByText('Blocked', { selector: '[data-slot="badge"]' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Last seen')).toBeInTheDocument();
        const ipTable = screen.getByRole('table', {
            name: 'IP address access records',
        });
        expect(
            within(ipTable).getByRole('columnheader', {
                name: /^Sort Created ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(ipTable).getByRole('columnheader', {
                name: /^Sort Updated ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(ipTable).getAllByRole('columnheader', { name: /Status/ }),
        ).toHaveLength(1);
        expect(
            within(ipTable).getByRole('columnheader', {
                name: /^Sort Created by ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(ipTable).getByRole('columnheader', {
                name: /^Sort Updated by ascending$/,
            }),
        ).toBeInTheDocument();
        expect(
            within(ipTable).getByRole('columnheader', {
                name: /^Sort Record status ascending$/,
            }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', {
                name: 'Actions for 203.0.113.10',
            }),
        );
        expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/access/ip-blocks/1/edit',
        );
        expect(screen.getByRole('menuitem', { name: 'View' })).toHaveAttribute(
            'href',
            '/access/ip-blocks/1',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Delete' }),
        ).toBeInTheDocument();
    });

    it('renders the IP block form on the dedicated edit page', () => {
        render(
            <IpBlockEditPage
                blockedIpAddress={{
                    id: 1,
                    ipAddress: '203.0.113.10',
                    user: null,
                    reason: 'Repeated abuse',
                    isActive: false,
                    blockedAt: null,
                    firstSeenAt: '2030-01-01T00:00:00Z',
                    lastSeenAt: '2030-01-01T01:00:00Z',
                    blockedBy: null,
                    unblockedAt: null,
                    unblockedBy: null,
                }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Edit IP address' }),
        ).toBeInTheDocument();
        expect(screen.getByDisplayValue('203.0.113.10')).toHaveAttribute(
            'readonly',
        );
        expect(
            screen.getByRole('button', { name: 'Block' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Unblock' }),
        ).not.toBeInTheDocument();
    });

    it('renders visit logs with activity details and filter controls', async () => {
        const user = userEvent.setup();

        render(
            <VisitLogsPage
                logs={{
                    data: [
                        {
                            id: 1,
                            user: null,
                            eventType: 'login',
                            outcome: 'success',
                            ipAddress: '198.51.100.10',
                            locationSource: null,
                            locationCountryCode: null,
                            locationRegion: null,
                            locationCity: null,
                            locationLatitude: null,
                            locationLongitude: null,
                            locationAccuracyMeters: null,
                            locationTimezone: null,
                            userAgent: 'Test browser',
                            method: 'GET',
                            routeName: 'login',
                            path: '/login',
                            statusCode: 302,
                            occurredAt: '2030-01-01T00:00:00Z',
                        },
                        {
                            id: 2,
                            user: null,
                            eventType: 'logout',
                            outcome: 'success',
                            ipAddress: '198.51.100.10',
                            locationSource: null,
                            locationCountryCode: null,
                            locationRegion: null,
                            locationCity: null,
                            locationLatitude: null,
                            locationLongitude: null,
                            locationAccuracyMeters: null,
                            locationTimezone: null,
                            userAgent: 'Test browser',
                            method: 'POST',
                            routeName: 'logout',
                            path: '/logout',
                            statusCode: 302,
                            occurredAt: '2030-01-01T01:00:00Z',
                        },
                    ],
                    current_page: 1,
                    last_page: 1,
                    total: 2,
                    from: 1,
                    to: 2,
                }}
                eventTypes={['login', 'logout']}
                filters={{
                    keyword: '',
                    event: '',
                    outcome: '',
                    statusCode: '',
                    from: '',
                    to: '',
                }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Visit logs' }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('198.51.100.10')).toHaveLength(2);
        expect(screen.getByText('/login')).toBeInTheDocument();
        expect(screen.getAllByText('302')).toHaveLength(2);
        expect(screen.getByText('Login')).toHaveClass(
            'bg-success/10',
            'text-success',
        );
        expect(screen.getByText('Logout')).toHaveClass(
            'bg-destructive/10',
            'text-destructive',
        );
        expect(
            screen.getByRole('button', { name: /Filter/ }),
        ).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /Filter/ }));
        expect(screen.getByLabelText('Keyword')).toHaveAttribute(
            'name',
            'keyword',
        );
        const filterDialog = screen.getByRole('dialog');
        expect(
            within(filterDialog).getByText('Event', { exact: true }),
        ).toBeInTheDocument();
        expect(
            within(filterDialog).queryByLabelText('Outcome'),
        ).not.toBeInTheDocument();
        expect(screen.queryByLabelText('IP address')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Location')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('User')).not.toBeInTheDocument();
        await user.keyboard('{Escape}');
        await user.click(
            screen.getByRole('button', { name: 'Actions for visit log 1' }),
        );
        expect(screen.getByRole('menuitem', { name: 'View' })).toHaveAttribute(
            'href',
            '/access/visit-logs/1',
        );
    });

    it('renders the shared details pages for access resources', () => {
        render(
            <UserShowPage
                user={{
                    id: 1,
                    name: 'Alex',
                    email: 'alex@example.com',
                    position: 'Supervisor',
                    department: 'Operations',
                    avatar: null,
                    status: 'active',
                    role: {
                        id: 1,
                        name: 'technician',
                        displayName: 'Technician',
                    },
                    emailVerifiedAt: '2030-01-01T00:00:00Z',
                    createdAt: '2030-01-01T00:00:00Z',
                    updatedAt: '2030-01-01T00:00:00Z',
                }}
                canEdit
                canDelete
                canSuspend
                canReactivate
            />,
        );
        expect(screen.getAllByRole('heading', { name: 'Alex' })).toHaveLength(
            2,
        );
        expect(
            document.querySelectorAll('[data-slot="details-view"]'),
        ).toHaveLength(1);
        expect(
            document.querySelectorAll('[data-slot="details-section"]'),
        ).toHaveLength(3);
        expect(
            document.querySelector('[data-slot="details-page"]'),
        ).toHaveClass('pt-0', 'sm:pt-0', 'lg:pt-0');
        expect(screen.getByText('Operations')).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="details-toolbar"]'),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/access/users/1/edit',
        );
        expect(
            screen.getByRole('button', { name: 'Block' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Delete' }),
        ).toBeInTheDocument();

        cleanup();
        render(
            <RoleShowPage
                role={{
                    id: 1,
                    name: 'technician',
                    displayName: 'Technician',
                    description: 'Field access',
                    isSystem: true,
                    usersCount: 1,
                    permissionsCount: 1,
                    permissions: ['dashboard.view'],
                    users: [
                        {
                            id: 1,
                            name: 'Alex',
                            email: 'alex@example.com',
                        },
                    ],
                }}
                canEdit
                canDelete
            />,
        );
        expect(
            screen.getAllByRole('heading', { name: 'Technician' }),
        ).toHaveLength(2);
        expect(
            document.querySelectorAll('[data-slot="details-view"]'),
        ).toHaveLength(1);
        expect(
            document.querySelectorAll('[data-slot="details-section"]'),
        ).toHaveLength(4);
        expect(screen.getByText('dashboard.view')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/access/roles/1/edit',
        );
        expect(
            screen.getByRole('button', { name: 'Delete' }),
        ).toBeInTheDocument();

        cleanup();
        render(
            <IpBlockShowPage
                blockedIpAddress={{
                    id: 1,
                    ipAddress: '203.0.113.10',
                    user: null,
                    reason: 'Repeated abuse',
                    isActive: true,
                    blockedAt: '2030-01-01T00:00:00Z',
                    firstSeenAt: '2030-01-01T00:00:00Z',
                    lastSeenAt: '2030-01-01T01:00:00Z',
                    blockedBy: null,
                    unblockedAt: null,
                    unblockedBy: null,
                }}
                canUpdate
                canDelete
            />,
        );
        expect(
            screen.getByRole('heading', { name: '203.0.113.10' }),
        ).toBeInTheDocument();
        expect(
            document.querySelectorAll('[data-slot="details-view"]'),
        ).toHaveLength(1);
        expect(
            document.querySelectorAll('[data-slot="details-section"]'),
        ).toHaveLength(3);
        expect(screen.getByText('Repeated abuse')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/access/ip-blocks/1/edit',
        );
        expect(
            screen.getByRole('button', { name: 'Allow' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Delete' }),
        ).toBeInTheDocument();

        cleanup();
        render(
            <VisitLogShowPage
                log={{
                    id: 1,
                    user: null,
                    eventType: 'login',
                    outcome: 'success',
                    ipAddress: '203.0.113.10',
                    locationSource: 'browser',
                    locationCountryCode: 'PH',
                    locationRegion: 'Metro Manila',
                    locationCity: 'Manila',
                    locationLatitude: 14.5995,
                    locationLongitude: 120.9842,
                    locationAccuracyMeters: 25.4,
                    locationTimezone: 'Asia/Manila',
                    userAgent: 'Test browser',
                    method: 'POST',
                    routeName: 'login.store',
                    path: '/login',
                    statusCode: 302,
                    occurredAt: '2030-01-01T00:00:00Z',
                }}
            />,
        );
        expect(
            screen.getByRole('heading', { name: 'Visit log details' }),
        ).toBeInTheDocument();
        expect(
            document.querySelectorAll('[data-slot="details-view"]'),
        ).toHaveLength(1);
        expect(
            document.querySelectorAll('[data-slot="details-section"]'),
        ).toHaveLength(2);
        expect(screen.getByText('/login')).toBeInTheDocument();

        cleanup();
        render(
            <AuditShowPage
                event={{
                    id: 1,
                    event: 'user.updated',
                    actor: null,
                    subjectType: 'App\\Models\\User',
                    subjectId: '1',
                    ipAddress: '203.0.113.10',
                    userAgent: 'Test browser',
                    before: { name: 'Old name' },
                    after: { name: 'Alex' },
                    occurredAt: '2030-01-01T00:00:00Z',
                }}
            />,
        );
        expect(
            screen.getByRole('heading', { name: 'Audit event details' }),
        ).toBeInTheDocument();
        expect(
            document.querySelectorAll('[data-slot="details-view"]'),
        ).toHaveLength(1);
        expect(
            document.querySelectorAll('[data-slot="details-section"]'),
        ).toHaveLength(3);
        expect(screen.getByText(/"name": "Old name"/)).toBeInTheDocument();
    });
});
