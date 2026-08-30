import { forwardRef } from 'react';
import type { FormEventHandler, FormHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type FormState = {
    processing: boolean;
    errors: Record<string, string>;
};

const formState = vi.hoisted(() => ({
    processing: false,
    errors: {} as Record<string, string>,
}));

type FormProps = Omit<
    FormHTMLAttributes<HTMLFormElement>,
    'children' | 'method'
> & {
    action?: string;
    method?: string;
    children?: ReactNode | ((state: FormState) => ReactNode);
    onSubmit?: FormEventHandler<HTMLFormElement>;
};

vi.mock('@inertiajs/react', () => {
    const toHref = (href: string | { url: string }) =>
        typeof href === 'string' ? href : href.url;

    return {
        Form: forwardRef<HTMLFormElement, FormProps>(function MockForm(
            { action, method, children, onSubmit, className },
            ref,
        ) {
            return (
                <form
                    ref={ref}
                    action={action}
                    method={method}
                    onSubmit={onSubmit}
                    className={className}
                >
                    {typeof children === 'function'
                        ? children(formState)
                        : children}
                </form>
            );
        }),
        Link: ({
            href,
            children,
            ...props
        }: {
            href: string | { url: string };
            children?: ReactNode;
        }) => (
            <a href={toHref(href)} {...props}>
                {children}
            </a>
        ),
        router: {
            visit: vi.fn(),
        },
    };
});

import ReferenceDataForm from '@/features/system/components/reference-data-form';
import {
    countryTableColumns,
    timezoneTableColumns,
} from '@/features/system/reference-data-table-model';
import type { Country, Timezone } from '@/features/system/types';
import { DataTable } from '@/components/ui/data-table';

const country: Country = {
    id: 1,
    code: 'PH',
    name: 'Philippines',
    recordStatus: 1,
    createdAt: '2026-08-30T08:00:00Z',
    updatedAt: '2026-08-30T08:00:00Z',
    createdBy: { id: 2, name: 'Admin', email: 'admin@example.com' },
    updatedBy: { id: 2, name: 'Admin', email: 'admin@example.com' },
};

const timezone: Timezone = {
    id: 2,
    name: 'Asia/Manila',
    recordStatus: 1,
    createdAt: null,
    updatedAt: null,
    createdBy: null,
    updatedBy: null,
};

describe('system reference data UI', () => {
    beforeEach(() => {
        localStorage.clear();
        formState.processing = false;
        formState.errors = {};
    });

    it('renders country columns, record status, row actions, and pagination', async () => {
        const user = userEvent.setup();

        render(
            <DataTable
                caption="Country directory"
                data={[country]}
                tableColumns={() =>
                    countryTableColumns({
                        filters: {
                            search: 'ph',
                            sort: '',
                            direction: 'asc',
                        },
                        canManage: true,
                        firstRowNumber: 1,
                    })
                }
                addDefaultColumns
                excludeDefaultColumns={['status']}
                columnVisibility={{
                    storageKey: 'system.countries.test',
                    defaultVisibleKeys: [
                        'code',
                        'name',
                        'created_at',
                        'updated_at',
                        'created_by',
                        'updated_by',
                        'record_status',
                    ],
                }}
                getRowKey={(row) => row.id}
                pagination={{
                    currentPage: 1,
                    lastPage: 1,
                    total: 1,
                    from: 1,
                    to: 1,
                    pageSize: 50,
                    itemLabel: 'countries',
                    links: [
                        { url: '/system/countries', label: '1', active: true },
                    ],
                }}
            />,
        );

        expect(
            screen.getByRole('columnheader', { name: '#' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: /Sort Country code/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: /Sort Name/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('columnheader', { name: 'Status' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Created' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Updated' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Created by' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Updated by' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Record status' }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Admin')).toHaveLength(2);
        expect(
            screen.getByRole('switch', {
                name: 'Active record for Philippines',
            }),
        ).toBeInTheDocument();
        expect(screen.getAllByText(/Showing 1–1 of 1 countries/)).toHaveLength(
            2,
        );

        expect(
            screen.getByRole('link', { name: 'Sort Country code ascending' }),
        ).toHaveAttribute(
            'href',
            '/system/countries?search=ph&sort=code&direction=asc',
        );

        await user.click(
            screen.getByRole('button', { name: 'Actions for Philippines' }),
        );
        expect(screen.getByRole('menuitem', { name: 'View' })).toHaveAttribute(
            'href',
            '/system/countries/1',
        );
        expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/system/countries/1/edit',
        );
        expect(
            screen.getByRole('menuitem', { name: 'Delete' }),
        ).toBeInTheDocument();
    });

    it('renders read-only record status and actions for viewers without manage permission', async () => {
        const user = userEvent.setup();

        render(
            <DataTable
                caption="Timezone directory"
                data={[timezone]}
                tableColumns={() =>
                    timezoneTableColumns({
                        filters: { search: '' },
                        canManage: false,
                        firstRowNumber: 1,
                    })
                }
                getRowKey={(row) => row.id}
            />,
        );

        expect(screen.getByText('Asia/Manila')).toBeInTheDocument();
        expect(
            screen.queryByRole('columnheader', { name: 'Status' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByRole('switch', {
                name: 'Active record for Asia/Manila',
            }),
        ).toBeInTheDocument();
        await user.click(
            screen.getByRole('button', { name: 'Actions for Asia/Manila' }),
        );
        expect(
            screen.getByRole('menuitem', { name: 'View' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: 'Edit' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('menuitem', { name: 'Delete' }),
        ).not.toBeInTheDocument();
    });

    it('renders country and timezone forms with server validation messages', () => {
        formState.errors = {
            code: 'The country code is already in use.',
            name: 'Enter a name.',
        };

        const { unmount } = render(
            <ReferenceDataForm
                resource="country"
                action="/system/countries"
                method="post"
                submitLabel="Create country"
                cancelHref="/system/countries"
            />,
        );

        expect(screen.getByLabelText('Country code')).toHaveValue('');
        expect(screen.getByLabelText('Name')).toHaveValue('');
        expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
        expect(
            screen.getByText('The country code is already in use.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Enter a name.')).toBeInTheDocument();
        expect(
            document.querySelector('form[action="/system/countries"]'),
        ).toBeInTheDocument();

        unmount();
        formState.errors = {};

        render(
            <ReferenceDataForm
                resource="timezone"
                action="/system/timezones"
                method="post"
                submitLabel="Create timezone"
                cancelHref="/system/timezones"
            />,
        );

        expect(screen.getByLabelText('Timezone')).toHaveValue('');
        expect(screen.queryByLabelText('Country code')).not.toBeInTheDocument();
        expect(
            screen.getByText(/valid IANA timezone identifier/),
        ).toBeInTheDocument();
    });
});
