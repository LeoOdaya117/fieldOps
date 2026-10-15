import { forwardRef } from 'react';
import type { FormEventHandler, FormHTMLAttributes, ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
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
        Head: () => null,
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
            post: vi.fn(),
        },
        usePage: () => ({
            props: {
                auth: {
                    authorization: {
                        permissions: [],
                    },
                },
            },
        }),
    };
});

import ReferenceDataForm from '@/features/system/components/reference-data-form';
import {
    countryTableColumns,
    timezoneTableColumns,
} from '@/features/system/reference-data-table-model';
import type {
    Country,
    PaginatedReferenceData,
    Timezone,
} from '@/features/system/types';
import { DataTable } from '@/components/ui/data-table';
import CountriesPage from '@/pages/system/countries';
import CountryShowPage from '@/pages/system/country-show';
import TimezonesPage from '@/pages/system/timezones';
import TimezoneShowPage from '@/pages/system/timezone-show';

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

const countryPageData: PaginatedReferenceData<Country> = {
    data: [country],
    current_page: 1,
    last_page: 1,
    total: 1,
    from: 1,
    to: 1,
    per_page: 50,
    links: [],
};

const timezonePageData: PaginatedReferenceData<Timezone> = {
    data: [timezone],
    current_page: 1,
    last_page: 1,
    total: 1,
    from: 1,
    to: 1,
    per_page: 50,
    links: [],
};

describe('system reference data UI', () => {
    beforeEach(() => {
        localStorage.clear();
        formState.processing = false;
        formState.errors = {};
    });

    it('restores the original reference-data filters without audit search fields', async () => {
        const user = userEvent.setup();
        const { unmount } = render(
            <CountriesPage
                countries={countryPageData}
                canUpdate
                canDelete
                canCreate
                filters={{ search: '' }}
            />,
        );

        const countryTable = screen.getByRole('table', {
            name: 'Country directory',
        });
        const countryTableContainer = countryTable.closest(
            '[data-slot="data-table-container"]',
        ) as HTMLElement;

        expect(
            within(countryTableContainer).getByRole('button', {
                name: /Filter/,
            }),
        ).toBeInTheDocument();
        await user.click(
            within(countryTableContainer).getByRole('button', {
                name: /Filter/,
            }),
        );
        expect(screen.getByLabelText('Date range')).toBeInTheDocument();
        expect(screen.queryByLabelText('Created by')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Updated by')).not.toBeInTheDocument();
        expect(
            screen.queryByRole('group', { name: 'Record status' }),
        ).not.toBeInTheDocument();
        await user.keyboard('{Escape}');
        expect(
            within(countryTableContainer).getByRole('link', {
                name: 'Create country',
            }),
        ).toHaveAttribute('href', '/system/countries/create');

        unmount();

        const { unmount: unmountDeletedFilter } = render(
            <CountriesPage
                countries={countryPageData}
                canViewDeleted
                filters={{ search: '' }}
            />,
        );

        await user.click(screen.getByRole('button', { name: /Filter/ }));
        const recordStatusGroup = screen.getByRole('group', {
            name: 'Record status',
        });
        expect(
            within(recordStatusGroup).getByRole('checkbox', {
                name: 'Active',
            }),
        ).toBeChecked();
        expect(
            within(recordStatusGroup).getByRole('checkbox', {
                name: 'Inactive',
            }),
        ).not.toBeChecked();

        unmountDeletedFilter();

        render(
            <TimezonesPage
                timezones={timezonePageData}
                canUpdate={false}
                canDelete={false}
                canCreate={false}
                filters={{ search: '' }}
            />,
        );

        const timezoneTable = screen.getByRole('table', {
            name: 'Timezone directory',
        });
        const timezoneTableContainer = timezoneTable.closest(
            '[data-slot="data-table-container"]',
        ) as HTMLElement;

        expect(
            within(timezoneTableContainer).getByRole('button', {
                name: /Filter/,
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'Create timezone' }),
        ).not.toBeInTheDocument();
    });

    it('renders country and timezone records through the shared detail view', () => {
        const { unmount } = render(
            <CountryShowPage country={country} canUpdate canDelete />,
        );

        expect(
            document.querySelectorAll('[data-slot="details-view"]'),
        ).toHaveLength(1);
        expect(
            document.querySelectorAll('[data-slot="details-section"]'),
        ).toHaveLength(3);
        expect(
            within(
                document.querySelector(
                    '[data-slot="details-view"]',
                ) as HTMLElement,
            ).getByRole('heading', { name: 'Philippines' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
            'href',
            '/system/countries/1/edit',
        );

        unmount();

        render(
            <TimezoneShowPage
                timezone={timezone}
                canUpdate
                canDelete
                isCurrent
            />,
        );

        expect(
            document.querySelectorAll('[data-slot="details-view"]'),
        ).toHaveLength(1);
        expect(
            within(
                document.querySelector(
                    '[data-slot="details-view"]',
                ) as HTMLElement,
            ).getByRole('heading', { name: 'Asia/Manila' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Current system timezone')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
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
                        canUpdate: true,
                        canDelete: true,
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
            screen.getByRole('columnheader', {
                name: /^Sort Record status ascending$/,
            }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Admin')).toHaveLength(2);
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getAllByText(/Showing 1–1 of 1 countries/)).toHaveLength(
            1,
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

    it('renders a record status badge and actions for viewers without status-update permission', async () => {
        const user = userEvent.setup();

        render(
            <DataTable
                caption="Timezone directory"
                data={[timezone]}
                tableColumns={() =>
                    timezoneTableColumns({
                        filters: { search: '' },
                        canUpdate: false,
                        canDelete: false,
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
        expect(screen.getByText('Active')).toBeInTheDocument();
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

    it('does not repeat the catalog heading inside country and timezone pages', () => {
        const { unmount } = render(
            <CountriesPage countries={countryPageData} />,
        );

        expect(
            screen.getByRole('heading', { name: 'Countries', level: 1 }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', {
                name: 'Country directory',
                level: 3,
            }),
        ).not.toBeInTheDocument();

        unmount();

        render(<TimezonesPage timezones={timezonePageData} />);

        expect(
            screen.getByRole('heading', { name: 'Timezones', level: 1 }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', {
                name: 'Timezone directory',
                level: 3,
            }),
        ).not.toBeInTheDocument();
    });
});
