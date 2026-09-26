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
import { formatDateTime } from '@/lib/format-date';
import { RecordStatusControl } from '@/components/ui/record-status-control';

function formatDate(value: string | null): string {
    return formatDateTime(value);
}

function countryFilters(filters: ReferenceDataFilters) {
    return {
        search: filters.search,
        from: filters.from,
        to: filters.to,
        record_status: filters.recordStatus,
    };
}

function timezoneFilters(filters: ReferenceDataFilters) {
    return {
        search: filters.search,
        from: filters.from,
        to: filters.to,
        record_status: filters.recordStatus,
    };
}

export function countryTableColumns({
    filters,
    canUpdate,
    canDelete,
    firstRowNumber,
    canUpdateDeleted = false,
}: {
    filters: ReferenceDataFilters;
    canUpdate: boolean;
    canDelete: boolean;
    firstRowNumber: number;
    canUpdateDeleted?: boolean;
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
            header: (
                <SortableColumn
                    action={countriesIndex.url()}
                    label="Record status"
                    sortKey="record_status"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (country) => (
                <RecordStatusControl
                    recordStatus={country.recordStatus}
                    label={country.name}
                    recordStatusUrl={country.recordStatusUrl}
                    canUpdateDeleted={canUpdateDeleted}
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
                    {canUpdate && (
                        <TableActionLink href={editCountry.url(country.id)}>
                            <Edit />
                            Edit
                        </TableActionLink>
                    )}
                    {canDelete ? (
                        <>
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
    canUpdate,
    canDelete,
    firstRowNumber,
    canUpdateDeleted = false,
}: {
    filters: ReferenceDataFilters;
    canUpdate: boolean;
    canDelete: boolean;
    firstRowNumber: number;
    canUpdateDeleted?: boolean;
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
            header: (
                <SortableColumn
                    action={timezonesIndex.url()}
                    label="Record status"
                    sortKey="record_status"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (timezone) => (
                <RecordStatusControl
                    recordStatus={timezone.recordStatus}
                    label={timezone.name}
                    recordStatusUrl={timezone.recordStatusUrl}
                    canUpdateDeleted={canUpdateDeleted}
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
                    {canUpdate && (
                        <TableActionLink href={editTimezone.url(timezone.id)}>
                            <Edit />
                            Edit
                        </TableActionLink>
                    )}
                    {canDelete ? (
                        <>
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

export { formatDate };
