import type { FormEventHandler, FormHTMLAttributes, ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

type FormProps = FormHTMLAttributes<HTMLFormElement> & {
    onSuccess?: () => void;
    children?:
        | ReactNode
        | ((state: {
              processing: boolean;
              errors: Record<string, string>;
          }) => ReactNode);
};

vi.mock('@inertiajs/react', () => ({
    Form: ({ children, onSuccess, onSubmit, ...props }: FormProps) => {
        const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
            onSubmit?.(event);

            if (!event.defaultPrevented) {
                onSuccess?.();
            }

            event.preventDefault();
        };

        return (
            <form {...props} onSubmit={handleSubmit}>
                {typeof children === 'function'
                    ? children({ processing: false, errors: {} })
                    : children}
            </form>
        );
    },
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
import RegistrationReviewPage from '@/pages/access/registration-review';
import RegistrationsPage from '@/pages/access/registrations';
import UserCreatePage from '@/pages/access/user-create';
import UserEditPage from '@/pages/access/user-edit';
import UserInvitePage from '@/pages/access/user-invite';
import UsersPage from '@/pages/access/users';
import RegisterPage from '@/pages/auth/register';

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
        ).toEqual(['Dashboard', 'Users', 'Add user']);
        expect(
            UserEditPage.layout.breadcrumbs.map((item) => item.title),
        ).toEqual(['Dashboard', 'Users', 'Edit user']);
        expect(
            UserInvitePage.layout.breadcrumbs.map((item) => item.title),
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
        expect(
            screen.getByRole('button', { name: /Search & filter/ }),
        ).toBeInTheDocument();
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
        await user.click(screen.getByRole('checkbox', { name: 'Select Alex' }));
        expect(screen.getByText('1 selected')).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="bulk-actions-row"]'),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Clear selected rows' }),
        );
        expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
        await user.click(screen.getByRole('checkbox', { name: 'Select Alex' }));
        await user.click(screen.getByRole('button', { name: 'Bulk actions' }));
        await user.click(
            screen.getByRole('menuitem', { name: 'Reactivate selected' }),
        );
        expect(screen.getByRole('dialog')).toHaveTextContent(
            'Reactivate 1 selected user(s)?',
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
            screen.getAllByRole('navigation', { name: 'Table pagination' }),
        ).toHaveLength(2);
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
        expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/access/users/1/edit',
        );
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

    it('keeps role creation and editing on dedicated pages', async () => {
        const user = userEvent.setup();
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
        expect(
            screen.getByText('Role details').closest('[data-slot="card"]'),
        ).toHaveClass('w-full');
        expect(
            document.querySelector('[data-slot="role-details-fields"]'),
        ).toHaveClass('items-start');
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
        expect(screen.getByLabelText('Role')).toHaveValue('1');
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
        expect(screen.getByText('pending@example.com')).toBeInTheDocument();
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

        expect(screen.queryByText('Role catalog')).not.toBeInTheDocument();
        expect(screen.queryByText('1 visible')).not.toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="index-page-toolbar"]'),
        ).not.toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="data-table-scroll-container"]'),
        ).toHaveClass('px-4');
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
            screen.getAllByRole('navigation', { name: 'Table pagination' }),
        ).toHaveLength(2);
        expect(screen.getAllByText('user.role_changed').length).toBeGreaterThan(
            0,
        );
        expect(screen.getByText(/technician/)).toBeInTheDocument();
    });
});
