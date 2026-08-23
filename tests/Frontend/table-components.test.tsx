import { forwardRef } from 'react';
import type { FormHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Form: forwardRef<
        HTMLFormElement,
        FormHTMLAttributes<HTMLFormElement>
    >(({ children, ...props }, ref) => (
        <form ref={ref} {...props}>
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

    it('renders reusable pagination controls with disabled edge states', () => {
        render(
            <TablePagination
                currentPage={2}
                lastPage={3}
                total={25}
                from={11}
                to={20}
                itemLabel="roles"
                previousUrl="/access/roles?page=1"
                nextUrl="/access/roles?page=3"
            />,
        );

        expect(screen.getByRole('navigation')).toHaveAccessibleName(
            'Table pagination',
        );
        expect(
            screen.getByText(/Showing 11–20 of 25 roles/),
        ).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
            'href',
            '/access/roles?page=1',
        );
        expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
            'href',
            '/access/roles?page=3',
        );
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
        ).toHaveAttribute(
            'href',
            '/access/users?sort=name&direction=desc',
        );
    });
});
