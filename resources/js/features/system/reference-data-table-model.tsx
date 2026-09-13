import { Edit, Eye, Trash2 } from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import type { DataTableColumn } from '@/components/ui/data-table';
import {
    TableActionForm,
    TableActionLink,
    TableActions,
} from '@/components/ui/table-actions';
import {
    destroy as deleteCountry,
    edit as editCountry,
    index as countriesIndex,
    show as showCountry,
} from '@/routes/system/countries';
import {
    destroy as deleteTimezone,
    edit as editTimezone,
    index as timezonesIndex,
    show as showTimezone,
} from '@/routes/system/timezones';
import type {
    Country,
    ReferenceDataFilters,
    Timezone,
} from '@/features/system/types';

type RecordStatusSwitchProps = {
    recordStatus: number;
    label: string;
};

function RecordStatusSwitch({ recordStatus, label }: RecordStatusSwitchProps) {
    const isActive = recordStatus === 1;

    return (
        <span
            role="switch"
            aria-checked={isActive}
            aria-disabled="true"
            aria-label={`${isActive ? 'Active' : 'Deleted'} record for ${label}`}
            className="inline-flex items-center gap-2 text-xs font-semibold"
        >
            <span
                aria-hidden="true"
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border ${isActive ? 'border-success/40 bg-success/80' : 'border-border bg-muted'}`}
            >
                <span
                    className={`size-3.5 rounded-full bg-background shadow-sm ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
            </span>
            <span>{isActive ? 'Active' : 'Deleted'}</span>
        </span>
    );
}

function formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleDateString() : '—';
}

function countryFilters(filters: ReferenceDataFilters) {
    return {
        search: filters.search,
    };
}

function timezoneFilters(filters: ReferenceDataFilters) {
    return {
        search: filters.search,
    };
}

export function countryTableColumns({
    filters,
    canManage,
    firstRowNumber,
}: {
    filters: ReferenceDataFilters;
    canManage: boolean;
    firstRowNumber: number;
}): DataTableColumn<Country>[] {
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'asc';
    const hidden = countryFilters(filters);

    return [
        {
            key: 'serial',
            header: '#',
            hideable: false,
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_country, index) => firstRowNumber + index,
        },
        {
            key: 'code',
            label: 'Country code',
            header: (
                <SortableColumn
                    action={countriesIndex.url()}
                    label="Country code"
                    sortKey="code"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (country) => (
                <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold text-foreground">
                    {country.code}
                </code>
            ),
        },
        {
            key: 'name',
            label: 'Name',
            header: (
                <SortableColumn
                    action={countriesIndex.url()}
                    label="Name"
                    sortKey="name"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (country) => (
                <span className="font-medium text-foreground">
                    {country.name}
                </span>
            ),
        },
        {
            key: 'record_status',
            label: 'Record status',
            header: 'Record status',
            cell: (country) => (
                <RecordStatusSwitch
                    recordStatus={country.recordStatus}
                    label={country.name}
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            hideable: false,
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (country) => (
                <TableActions label={`Actions for ${country.name}`}>
                    <TableActionLink href={showCountry.url(country.id)}>
                        <Eye />
                        View
                    </TableActionLink>
                    {canManage ? (
                        <>
                            <TableActionLink href={editCountry.url(country.id)}>
                                <Edit />
                                Edit
                            </TableActionLink>
                            <TableActionForm
                                action={deleteCountry.url(country.id)}
                                method="delete"
                                destructive
                                confirmation={{
                                    title: `Delete ${country.name}?`,
                                    description:
                                        'This will soft-delete the country and keep its audit history.',
                                    confirmLabel: 'Delete',
                                }}
                            >
                                <Trash2 />
                                Delete
                            </TableActionForm>
                        </>
                    ) : null}
                </TableActions>
            ),
        },
    ];
}

export function timezoneTableColumns({
    filters,
    canManage,
    firstRowNumber,
}: {
    filters: ReferenceDataFilters;
    canManage: boolean;
    firstRowNumber: number;
}): DataTableColumn<Timezone>[] {
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'asc';
    const hidden = timezoneFilters(filters);

    return [
        {
            key: 'serial',
            header: '#',
            hideable: false,
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_timezone, index) => firstRowNumber + index,
        },
        {
            key: 'name',
            label: 'Timezone',
            header: (
                <SortableColumn
                    action={timezonesIndex.url()}
                    label="Timezone"
                    sortKey="name"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (timezone) => (
                <code className="font-mono text-sm text-foreground">
                    {timezone.name}
                </code>
            ),
        },
        {
            key: 'record_status',
            label: 'Record status',
            header: 'Record status',
            cell: (timezone) => (
                <RecordStatusSwitch
                    recordStatus={timezone.recordStatus}
                    label={timezone.name}
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            hideable: false,
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (timezone) => (
                <TableActions label={`Actions for ${timezone.name}`}>
                    <TableActionLink href={showTimezone.url(timezone.id)}>
                        <Eye />
                        View
                    </TableActionLink>
                    {canManage ? (
                        <>
                            <TableActionLink
                                href={editTimezone.url(timezone.id)}
                            >
                                <Edit />
                                Edit
                            </TableActionLink>
                            <TableActionForm
                                action={deleteTimezone.url(timezone.id)}
                                method="delete"
                                destructive
                                confirmation={{
                                    title: `Delete ${timezone.name}?`,
                                    description:
                                        'This will soft-delete the timezone and keep its audit history.',
                                    confirmLabel: 'Delete',
                                }}
                            >
                                <Trash2 />
                                Delete
                            </TableActionForm>
                        </>
                    ) : null}
                </TableActions>
            ),
        },
    ];
}

export { RecordStatusSwitch, formatDate };
