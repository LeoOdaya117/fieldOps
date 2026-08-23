import type { FormHTMLAttributes, ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

type FormProps = FormHTMLAttributes<HTMLFormElement> & {
    children?:
        | ReactNode
        | ((state: {
              processing: boolean;
              errors: Record<string, string>;
          }) => ReactNode);
};

vi.mock('@inertiajs/react', () => ({
    Form: ({ children, ...props }: FormProps) => (
        <form {...props}>
            {typeof children === 'function'
                ? children({ processing: false, errors: {} })
                : children}
        </form>
    ),
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children?: ReactNode;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

import AuditPage from '@/pages/access/audit';
import RoleCreatePage from '@/pages/access/role-create';
import RoleEditPage from '@/pages/access/role-edit';
import RolesPage from '@/pages/access/roles';
import UserCreatePage from '@/pages/access/user-create';
import UsersPage from '@/pages/access/users';

afterEach(() => cleanup());

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
        ).toEqual(['Dashboard', 'Users', 'Invite user']);
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
                            status: 'active',
                            role: {
                                id: 1,
                                name: 'technician',
                                displayName: 'Technician',
                                isSystem: true,
                            },
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
        expect(
            screen.getByRole('button', { name: /Search & filter/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Invite user' }),
        ).toHaveAttribute('href', '/access/users/create');
        expect(screen.getAllByRole('table')).toHaveLength(2);
        await user.click(screen.getByRole('checkbox', { name: 'Select Alex' }));
        expect(screen.getByText('1 selected')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Clear selected rows' }),
        );
        expect(
            screen.getByRole('navigation', { name: 'Table pagination' }),
        ).toBeInTheDocument();
        expect(screen.getByText('new@example.com')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Actions for Alex' }),
        );
        expect(
            screen.queryByRole('button', { name: 'Suspend' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('menuitem', { name: 'Suspend' }),
        ).toBeInTheDocument();
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
            screen.getByRole('button', { name: /Search & filter/ }),
        ).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        await user.click(
            screen.getByRole('checkbox', { name: 'Select Reviewer' }),
        );
        expect(screen.getByText('1 selected')).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Clear selected rows' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Actions for Reviewer' }),
        );
        expect(
            screen.getByRole('menuitem', { name: 'Edit Reviewer' }),
        ).toHaveAttribute('href', '/access/roles/2/edit');
        expect(
            screen.getByRole('menuitem', { name: 'Delete' }),
        ).toBeInTheDocument();
    });

    it('keeps role creation and editing on dedicated pages', () => {
        const permissions = [
            { id: 1, name: 'audit.view' },
            { id: 2, name: 'dashboard.view' },
            { id: 3, name: 'roles.create' },
            { id: 4, name: 'users.view' },
        ];

        render(<RoleCreatePage permissions={permissions} />);

        expect(
            screen.getByRole('heading', { name: 'Create custom role' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create role' }),
        ).toBeInTheDocument();
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

        cleanup();

        render(
            <RoleEditPage
                permissions={permissions}
                role={{
                    id: 2,
                    name: 'reviewer',
                    displayName: 'Reviewer',
                    description: 'Custom',
                    permissions: ['dashboard.view'],
                }}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Edit Reviewer' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Save changes' }),
        ).toBeInTheDocument();
    });

    it('keeps user invitations on a dedicated page', () => {
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
            screen.getByRole('heading', { name: 'Invite a user' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Send invitation' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Back to users' }),
        ).toHaveAttribute('href', '/access/users');
    });

    it('shows system role actions to owner-level administrators', async () => {
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

        expect(screen.getByText('System')).toBeInTheDocument();
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

    it('renders an auditable event with before and after values', () => {
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
            screen.getByRole('button', { name: /Search & filter/ }),
        ).toBeInTheDocument();
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(
            screen.getByRole('navigation', { name: 'Table pagination' }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('user.role_changed').length).toBeGreaterThan(
            0,
        );
        expect(screen.getByText(/technician/)).toBeInTheDocument();
    });
});
