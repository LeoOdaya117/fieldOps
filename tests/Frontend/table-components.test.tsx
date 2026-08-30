import { forwardRef } from 'react';
import type { FormHTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const inertiaRouter = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    router: inertiaRouter,
    Form: forwardRef<
        HTMLFormElement,
        FormHTMLAttributes<HTMLFormElement> & { onSuccess?: () => void }
    >(({ children, onSuccess, onSubmit, ...props }, ref) => (
        <form
            ref={ref}
            {...props}
            onSubmit={(event) => {
                onSubmit?.(event);

                if (!event.defaultPrevented) {
                    onSuccess?.();
                }

                event.preventDefault();
            }}
        >
            {children}
        </form>
    )),
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

import { SortableColumn } from '@/components/sortable-column';
import { BulkActionForm, BulkActions } from '@/components/ui/bulk-actions';
import { buttonVariants } from '@/components/ui/button';
import {
    DataTable,
    DataTableBody,
    DataTableCell,
    DataTableHead,
    DataTableHeader,
    DataTableRow,
    DataTableToolbar,
} from '@/components/ui/data-table';
import {
    TableActionForm,
    TableActionLink,
    TableActions,
} from '@/components/ui/table-actions';
import { TablePagination } from '@/components/ui/table-pagination';

describe('reusable data table components', () => {
    afterEach(() => {
        localStorage.clear();
    });

    it('uses the high-contrast link token for links and active sorting', () => {
        expect(buttonVariants({ variant: 'link' })).toContain('text-link');

        render(
            <SortableColumn
                action="/access/users"
                label="User"
                sortKey="name"
                sort="name"
                direction="asc"
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Sort User descending' }),
        ).toHaveClass('bg-link/10', 'text-link');
        expect(screen.getByRole('link').querySelector('svg')).toHaveClass(
            'text-link',
        );
    });

    it('renders bulk actions with selected ids and a clear control', async () => {
        const user = userEvent.setup();
        const onClear = vi.fn();

        render(
            <BulkActions selectedIds={[4, 9]} onClear={onClear}>
                <BulkActionForm
                    action="/access/users/bulk/suspend"
                    method="patch"
                    ids={[4, 9]}
                >
                    Suspend selected
                </BulkActionForm>
            </BulkActions>,
        );

        expect(screen.getByText('2 selected')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Bulk actions' }));
        expect(document.querySelectorAll('input[name="ids[]"]')).toHaveLength(
            2,
        );
        expect(
            screen.getByRole('menuitem', { name: 'Suspend selected' }),
        ).toBeInTheDocument();

        await user.keyboard('{Escape}');
        await user.click(
            screen.getByRole('button', { name: 'Clear selected rows' }),
        );
        expect(onClear).toHaveBeenCalledOnce();
    });

    it('forwards successful bulk submissions to the caller', async () => {
        const user = userEvent.setup();
        const onSuccess = vi.fn();

        render(
            <BulkActions selectedIds={[4]} onClear={vi.fn()}>
                <BulkActionForm
                    action="/access/users/bulk/reactivate"
                    method="patch"
                    ids={[4]}
                    onSuccess={onSuccess}
                >
                    Reactivate selected
                </BulkActionForm>
            </BulkActions>,
        );

        await user.click(screen.getByRole('button', { name: 'Bulk actions' }));
        fireEvent.submit(
            document.querySelector(
                'form[action="/access/users/bulk/reactivate"]',
            ) as HTMLFormElement,
        );
        expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('requires confirmation before submitting a bulk action', async () => {
        const user = userEvent.setup();
        const submitSpy = vi
            .spyOn(HTMLFormElement.prototype, 'submit')
            .mockImplementation(() => undefined);

        render(
            <BulkActions selectedIds={[4, 9]} onClear={vi.fn()}>
                <BulkActionForm
                    action="/access/users/bulk/reactivate"
                    method="patch"
                    ids={[4, 9]}
                    confirmation={{
                        title: 'Reactivate 2 selected user(s)?',
                        description: 'These accounts will regain access.',
                        confirmLabel: 'Reactivate users',
                    }}
                >
                    Reactivate selected
                </BulkActionForm>
            </BulkActions>,
        );

        await user.click(screen.getByRole('button', { name: 'Bulk actions' }));
        await user.click(
            screen.getByRole('menuitem', { name: 'Reactivate selected' }),
        );

        expect(screen.getByRole('dialog')).toHaveTextContent(
            'Reactivate 2 selected user(s)?',
        );
        expect(submitSpy).not.toHaveBeenCalled();

        await user.click(
            screen.getByRole('button', { name: 'Reactivate users' }),
        );

        expect(submitSpy).toHaveBeenCalledOnce();
        submitSpy.mockRestore();
    });

    it('renders a shared toolbar for table context and metadata', () => {
        render(
            <DataTableToolbar>
                <span>Account directory</span>
                <span>Assign one role per account</span>
            </DataTableToolbar>,
        );

        expect(
            document.querySelector('[data-slot="data-table-toolbar"]'),
        ).toBeInTheDocument();
        expect(screen.getByText('Account directory')).toBeInTheDocument();
        expect(
            screen.getByText('Assign one role per account'),
        ).toBeInTheDocument();
    });

    it('renders accessible table structure, actions, and action anchors', async () => {
        const user = userEvent.setup();
        render(
            <DataTable caption="Example records">
                <DataTableHeader>
                    <DataTableRow>
                        <DataTableHead scope="col">Name</DataTableHead>
                        <DataTableHead scope="col">Actions</DataTableHead>
                    </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                    <DataTableRow>
                        <DataTableCell>Regional manager</DataTableCell>
                        <DataTableCell>
                            <TableActions>
                                <TableActionLink href="/access/roles/1/edit">
                                    Edit
                                </TableActionLink>
                                <TableActionForm
                                    action="/access/roles/1"
                                    method="delete"
                                    destructive
                                >
                                    Delete
                                </TableActionForm>
                            </TableActions>
                        </DataTableCell>
                    </DataTableRow>
                </DataTableBody>
            </DataTable>,
        );

        expect(screen.getByRole('table')).toHaveAccessibleName(
            'Example records',
        );
        expect(screen.getByText('Regional manager')).toBeInTheDocument();
        expect(
            screen.getByRole('cell', { name: /Regional manager/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Manage columns' }),
        ).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Row actions' }));
        expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/access/roles/1/edit',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Delete' }),
        ).toBeInTheDocument();
    });

    it('opens a confirmation dialog before a destructive row action', async () => {
        const user = userEvent.setup();
        const submitSpy = vi
            .spyOn(HTMLFormElement.prototype, 'submit')
            .mockImplementation(() => undefined);

        render(
            <TableActions>
                <TableActionForm
                    action="/access/roles/1"
                    method="delete"
                    destructive
                    confirmation={{
                        title: 'Delete role?',
                        description: 'The role will be archived.',
                        confirmLabel: 'Delete role',
                    }}
                >
                    Delete
                </TableActionForm>
            </TableActions>,
        );

        await user.click(screen.getByRole('button', { name: 'Row actions' }));
        await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

        expect(screen.getByRole('dialog')).toHaveTextContent('Delete role?');
        expect(
            screen.getByRole('button', { name: 'Delete role' }),
        ).toBeInTheDocument();
        expect(submitSpy).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'Delete role' }));

        expect(submitSpy).toHaveBeenCalledOnce();
        submitSpy.mockRestore();
    });

    it('renders rows from declarative table column definitions', () => {
        render(
            <DataTable
                caption="Declarative records"
                data={[
                    { id: 7, name: 'Regional manager' },
                    { id: 8, name: 'Dispatcher' },
                ]}
                tableColumns={() => [
                    {
                        key: 'serial',
                        header: '#',
                        cell: (_row, index) => index + 1,
                    },
                    {
                        key: 'name',
                        header: 'Name',
                        accessor: 'name',
                    },
                ]}
                getRowKey={(row) => row.id}
                containerClassName="rounded-none border-0"
                scrollContainerClassName="px-4"
            />,
        );

        expect(screen.getByRole('table')).toHaveAccessibleName(
            'Declarative records',
        );
        expect(
            screen.getByRole('columnheader', { name: '#' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument();
        expect(screen.getByText('Regional manager')).toBeInTheDocument();
        expect(screen.getByText('Dispatcher')).toBeInTheDocument();
        expect(
            document.querySelector('[data-slot="data-table-container"]'),
        ).toHaveClass('rounded-none', 'border-0');
        expect(
            document.querySelector('[data-slot="data-table-scroll-container"]'),
        ).toHaveClass('px-4');
    });

    it('toggles declarative columns while preserving fixed utility columns', async () => {
        const user = userEvent.setup();

        render(
            <DataTable
                caption="Visible records"
                data={[{ id: 7, name: 'Regional manager', email: 'manager@example.com', status: 'Active' }]}
                tableColumns={[
                    {
                        key: 'selection',
                        header: 'Select',
                        hideable: false,
                    },
                    {
                        key: 'name',
                        header: 'Name',
                        label: 'Name',
                        accessor: 'name',
                    },
                    {
                        key: 'email',
                        header: 'Email',
                        label: 'Email',
                        accessor: 'email',
                    },
                    {
                        key: 'status',
                        header: 'Status',
                        label: 'Status',
                        accessor: 'status',
                    },
                    {
                        key: 'actions',
                        header: 'Actions',
                        hideable: false,
                    },
                ]}
                columnVisibility={{
                    storageKey: 'tests.visibility',
                    defaultVisibleKeys: ['name', 'status'],
                }}
                getRowKey={(row) => row.id}
            />,
        );

        expect(screen.getByRole('columnheader', { name: 'Select' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();
        expect(screen.queryByText('manager@example.com')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Manage columns' }));

        const checkAll = screen.getByRole('menuitemcheckbox', {
            name: 'Check all columns',
        });
        expect(checkAll).toHaveAttribute('aria-checked', 'mixed');
        expect(
            screen.queryByRole('menuitemcheckbox', { name: 'Select' }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole('menuitemcheckbox', { name: 'Name' }));

        expect(checkAll).toHaveAttribute('aria-checked', 'mixed');

        await user.keyboard('{Escape}');

        expect(screen.queryByRole('columnheader', { name: 'Name' })).not.toBeInTheDocument();
        expect(screen.queryByText('Regional manager')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Manage columns' }));
        const reopenedCheckAll = screen.getByRole('menuitemcheckbox', {
            name: 'Check all columns',
        });
        await user.click(reopenedCheckAll);

        await user.keyboard('{Escape}');

        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Manage columns' }));
        await user.click(
            screen.getByRole('menuitemcheckbox', {
                name: 'Check all columns',
            }),
        );

        await user.keyboard('{Escape}');

        expect(screen.queryByRole('columnheader', { name: 'Name' })).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Select' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Manage columns' }));
        await user.click(screen.getByRole('menuitem', { name: 'Reset to defaults' }));

        await user.keyboard('{Escape}');

        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();
    });

    it('persists and safely restores column visibility per table key', async () => {
        const user = userEvent.setup();
        const table = (
            <DataTable
                caption="Persistent records"
                data={[{ id: 1, name: 'Example', email: 'example@example.com' }]}
                tableColumns={[
                    { key: 'name', header: 'Name', accessor: 'name' },
                    { key: 'email', header: 'Email', accessor: 'email' },
                ]}
                columnVisibility={{
                    storageKey: 'tests.persistence',
                    defaultVisibleKeys: ['name', 'email'],
                }}
                getRowKey={(row) => row.id}
            />
        );

        const firstRender = render(table);

        await user.click(screen.getByRole('button', { name: 'Manage columns' }));
        await user.click(screen.getByRole('menuitemcheckbox', { name: 'Name' }));

        expect(localStorage.getItem('fieldops:data-table-columns:tests.persistence')).toBe(
            JSON.stringify({ visibleKeys: ['email'] }),
        );

        firstRender.unmount();
        render(table);

        expect(screen.queryByRole('columnheader', { name: 'Name' })).not.toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    });

    it('falls back to defaults for malformed or entirely stale visibility data', () => {
        const storageKey = 'fieldops:data-table-columns:tests.invalid';
        localStorage.setItem(storageKey, '{invalid json');

        const table = (
            <DataTable
                caption="Safe records"
                data={[{ id: 1, name: 'Example', email: 'example@example.com' }]}
                tableColumns={[
                    { key: 'name', header: 'Name', accessor: 'name' },
                    { key: 'email', header: 'Email', accessor: 'email' },
                ]}
                columnVisibility={{
                    storageKey: 'tests.invalid',
                    defaultVisibleKeys: ['name'],
                }}
                getRowKey={(row) => row.id}
            />
        );

        const firstRender = render(table);

        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();

        firstRender.unmount();
        localStorage.setItem(storageKey, JSON.stringify({ visibleKeys: ['removed'] }));
        render(table);

        expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Email' })).not.toBeInTheDocument();
    });

    it('renders pagination inside the data table container when configured', () => {
        render(
            <DataTable
                caption="Paginated records"
                data={[{ id: 1, name: 'Example' }]}
                tableColumns={[
                    { key: 'name', header: 'Name', accessor: 'name' },
                ]}
                pagination={{
                    currentPage: 2,
                    lastPage: 3,
                    total: 25,
                    from: 11,
                    to: 20,
                    itemLabel: 'records',
                    previousUrl: '/records?page=1',
                    nextUrl: '/records?page=3',
                    links: [
                        {
                            url: '/records?page=1',
                            label: '1',
                            active: false,
                        },
                        {
                            url: '/records?page=2',
                            label: '2',
                            active: true,
                        },
                        {
                            url: '/records?page=3',
                            label: '3',
                            active: false,
                        },
                    ],
                }}
            />,
        );

        const container = document.querySelector(
            '[data-slot="data-table-container"]',
        );

        expect(container).toContainElement(screen.getByRole('table'));
        const navigations = screen.getAllByRole('navigation');

        expect(container).toContainElement(navigations[0]);
        expect(navigations).toHaveLength(2);
        expect(navigations[0]).toHaveAccessibleName('Table pagination');
        expect(navigations[0]).toHaveClass('px-4');
        expect(navigations[0]).toHaveClass('lg:flex-row');
        expect(navigations[0]).not.toHaveClass('border-b');
        expect(navigations[1]).not.toHaveClass('border-t');
    });

    it('adds optional default audit columns to declarative tables', () => {
        render(
            <DataTable
                caption="Audited records"
                data={[
                    {
                        id: 1,
                        name: 'Example',
                        created_at: '2030-01-02T00:00:00Z',
                        updated_at: '2030-01-03T00:00:00Z',
                        created_by: { name: 'Owner' },
                        updated_by: { name: 'Admin' },
                        status: 'active',
                        record_status: 1,
                    },
                ]}
                tableColumns={[
                    { key: 'name', header: 'Name', accessor: 'name' },
                ]}
                addDefaultColumns
                getRowKey={(row) => row.id}
            />,
        );

        expect(
            screen.getByRole('columnheader', { name: 'Created' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Record status' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Owner')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders reusable numbered pagination controls with arrow navigation', () => {
        inertiaRouter.get.mockClear();

        render(
            <TablePagination
                currentPage={2}
                lastPage={3}
                total={25}
                from={11}
                to={20}
                pageSize={50}
                itemLabel="roles"
                previousUrl="/access/roles?page=1"
                nextUrl="/access/roles?page=3"
                links={[
                    {
                        url: '/access/roles?page=1',
                        label: '1',
                        active: false,
                    },
                    {
                        url: '/access/roles?page=2',
                        label: '2',
                        active: true,
                    },
                    {
                        url: '/access/roles?page=3',
                        label: '3',
                        active: false,
                    },
                ]}
            />,
        );

        expect(screen.getByRole('navigation')).toHaveAccessibleName(
            'Table pagination',
        );
        expect(
            screen.getByText(/Showing 11–20 of 25 roles/),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Previous page' }),
        ).toHaveAttribute('href', '/access/roles?page=1');
        expect(screen.getByRole('link', { name: 'Page 1' })).toHaveAttribute(
            'href',
            '/access/roles?page=1',
        );
        expect(screen.getByRole('link', { name: 'Page 2' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByRole('link', { name: 'Page 3' })).toHaveAttribute(
            'href',
            '/access/roles?page=3',
        );
        expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
            'href',
            '/access/roles?page=3',
        );
        expect(screen.queryByText('Previous')).not.toBeInTheDocument();
        expect(screen.queryByText('Next')).not.toBeInTheDocument();
        expect(
            screen.getByRole('combobox', { name: 'Rows per page' }),
        ).toHaveValue('50');
        expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument();

        fireEvent.change(
            screen.getByRole('combobox', { name: 'Rows per page' }),
            { target: { value: '100' } },
        );

        expect(inertiaRouter.get).toHaveBeenCalledWith(
            expect.stringContaining('per_page=100'),
            {},
            { preserveScroll: true },
        );
    });

    it('renders ellipses and disabled arrows at pagination edges', () => {
        render(
            <TablePagination
                currentPage={1}
                lastPage={20}
                total={200}
                from={1}
                to={10}
                nextUrl="/records?page=2"
                links={[
                    {
                        url: null,
                        label: '&laquo; Previous',
                        active: false,
                    },
                    {
                        url: '/records?page=1',
                        label: '1',
                        active: true,
                    },
                    {
                        url: '/records?page=2',
                        label: '2',
                        active: false,
                    },
                    {
                        url: '/records?page=3',
                        label: '3',
                        active: false,
                    },
                    {
                        url: '/records?page=4',
                        label: '4',
                        active: false,
                    },
                    {
                        url: '/records?page=5',
                        label: '5',
                        active: false,
                    },
                    {
                        url: '/records?page=6',
                        label: '6',
                        active: false,
                    },
                    { url: null, label: '...', active: false },
                    {
                        url: '/records?page=20',
                        label: '20',
                        active: false,
                    },
                    {
                        url: '/records?page=2',
                        label: 'Next &raquo;',
                        active: false,
                    },
                ]}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Previous page' }),
        ).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
            'href',
            '/records?page=2',
        );
        expect(screen.getByRole('link', { name: 'Page 1' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByRole('link', { name: 'Page 20' })).toHaveAttribute(
            'href',
            '/records?page=20',
        );
        expect(screen.getByText('…')).toBeInTheDocument();
    });

    it('sorts a column immediately when its header is clicked', () => {
        render(
            <SortableColumn
                action="/access/roles"
                label="Role"
                sortKey="display_name"
                hidden={{ search: 'admin', type: 'system' }}
            />,
        );

        const header = screen.getByRole('link', {
            name: 'Sort Role ascending',
        });

        expect(header).toHaveAttribute(
            'href',
            '/access/roles?search=admin&type=system&sort=display_name&direction=asc',
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('toggles a sortable header from ascending to descending', () => {
        render(
            <SortableColumn
                action="/access/users"
                label="User"
                sortKey="name"
                sort="name"
                direction="asc"
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Sort User descending' }),
        ).toHaveAttribute('href', '/access/users?sort=name&direction=desc');
    });
});
