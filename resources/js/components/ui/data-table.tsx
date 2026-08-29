import type { ComponentProps, Key, ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { TablePagination } from '@/components/ui/table-pagination';
import type { TablePaginationProps } from '@/components/ui/table-pagination';
import { cn } from '@/lib/utils';

type DataTableColumn<T> = {
    key: string;
    header: ReactNode;
    headerClassName?: string;
    cellClassName?: string;
    accessor?: keyof T | ((row: T, index: number) => ReactNode);
    cell?: (row: T, index: number) => ReactNode;
};

type DataTableProps<T = unknown> = ComponentProps<'table'> & {
    caption?: ReactNode;
    data?: readonly T[];
    addDefaultColumns?: boolean;
    containerClassName?: string;
    scrollContainerClassName?: string;
    tableColumns?:
        | readonly DataTableColumn<T>[]
        | (() => readonly DataTableColumn<T>[]);
    pagination?: TablePaginationProps | null;
    getRowKey?: (row: T, index: number) => Key;
    getRowProps?: (
        row: T,
        index: number,
    ) => Omit<ComponentProps<'tr'>, 'children' | 'key'>;
};

function DataTable<T>({
    caption,
    className,
    children,
    data,
    addDefaultColumns = false,
    containerClassName,
    scrollContainerClassName,
    tableColumns,
    pagination,
    getRowKey,
    getRowProps,
    ...props
}: DataTableProps<T>) {
    const configuredColumns =
        typeof tableColumns === 'function' ? tableColumns() : tableColumns;
    const columns =
        configuredColumns === undefined && children !== undefined
            ? undefined
            : addDefaultColumns
              ? mergeDefaultColumns(configuredColumns ?? [])
              : configuredColumns;
    const isDeclarative = columns !== undefined;

    return (
        <div
            data-slot="data-table-container"
            className={cn(
                'relative w-full rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-border/20',
                containerClassName,
            )}
        >
            {pagination ? (
                <TablePagination {...pagination} position="top" />
            ) : null}
            <div
                data-slot="data-table-scroll-container"
                className={cn(
                    'w-full overflow-x-auto overscroll-x-contain',
                    scrollContainerClassName,
                )}
            >
                <table
                    data-slot="data-table"
                    className={cn('w-full caption-bottom text-left text-sm', className)}
                    {...props}
                >
                    {caption ? <caption className="sr-only">{caption}</caption> : null}
                    {isDeclarative ? (
                        <>
                            <DataTableHeader>
                                <DataTableRow className="hover:bg-transparent">
                                    {columns.map((column) => (
                                        <DataTableHead
                                            key={column.key}
                                            scope="col"
                                            className={column.headerClassName}
                                        >
                                            {column.header}
                                        </DataTableHead>
                                    ))}
                                </DataTableRow>
                            </DataTableHeader>
                            <DataTableBody>
                                {(data ?? []).map((row, index) => {
                                    const rowProps = getRowProps?.(row, index);

                                    return (
                                        <DataTableRow
                                            key={getRowKey?.(row, index) ?? index}
                                            {...rowProps}
                                        >
                                            {columns.map((column) => (
                                                <DataTableCell
                                                    key={column.key}
                                                    className={column.cellClassName}
                                                >
                                                    {column.cell
                                                        ? column.cell(row, index)
                                                        : typeof column.accessor ===
                                                            'function'
                                                          ? column.accessor(
                                                                row,
                                                                index,
                                                            )
                                                        : column.accessor
                                                          ? (() => {
                                                                const value =
                                                                    row[
                                                                        column
                                                                            .accessor
                                                                    ];

                                                                return value == null
                                                                    ? null
                                                                    : String(value);
                                                            })()
                                                          : null}
                                                </DataTableCell>
                                            ))}
                                        </DataTableRow>
                                    );
                                })}
                            </DataTableBody>
                        </>
                    ) : (
                        children
                    )}
                </table>
            </div>
            {pagination ? (
                <TablePagination {...pagination} position="bottom" />
            ) : null}
        </div>
    );
}

function readDefaultValue(row: unknown, key: string) {
    if (!row || typeof row !== 'object') {
        return undefined;
    }

    const record = row as Record<string, unknown>;
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
        letter.toUpperCase(),
    );

    return record[key] ?? record[camelKey];
}

function formatDefaultDate(value: unknown) {
    if (!value) {
        return '—';
    }

    const date = new Date(String(value));

    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatActor(value: unknown) {
    if (value && typeof value === 'object') {
        const actor = value as Record<string, unknown>;

        return String(actor.name ?? actor.email ?? actor.id ?? '—');
    }

    return value == null || value === '' ? '—' : String(value);
}

function formatDefaultValue(value: unknown) {
    if (value == null || value === '') {
        return '—';
    }

    if (typeof value === 'object' && 'value' in value) {
        return String(value.value);
    }

    return String(value);
}

function formatRecordStatus(value: unknown) {
    const isDeleted = value === 0 || value === '0' || value === false;

    return (
        <Badge
            variant="outline"
            className={
                isDeleted
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-success/30 bg-success/10 text-success'
            }
        >
            <span className="size-1.5 rounded-full bg-current" />
            {isDeleted ? 'Deleted' : 'Active'}
        </Badge>
    );
}

function defaultTableColumns(): DataTableColumn<unknown>[] {
    return [
        {
            key: 'created_at',
            header: 'Created',
            cell: (row) => formatDefaultDate(readDefaultValue(row, 'created_at')),
        },
        {
            key: 'updated_at',
            header: 'Updated',
            cell: (row) => formatDefaultDate(readDefaultValue(row, 'updated_at')),
        },
        {
            key: 'created_by',
            header: 'Created by',
            cell: (row) => formatActor(readDefaultValue(row, 'created_by')),
        },
        {
            key: 'updated_by',
            header: 'Updated by',
            cell: (row) => formatActor(readDefaultValue(row, 'updated_by')),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (row) => formatDefaultValue(readDefaultValue(row, 'status')),
        },
        {
            key: 'record_status',
            header: 'Record status',
            cell: (row) => formatRecordStatus(readDefaultValue(row, 'record_status')),
        },
    ];
}

function mergeDefaultColumns<T>(columns: readonly DataTableColumn<T>[]) {
    const keys = new Set(columns.map((column) => column.key));
    const defaults = defaultTableColumns().filter((column) => !keys.has(column.key));

    return [...columns, ...(defaults as DataTableColumn<T>[])];
}

function DataTableHeader({ className, ...props }: ComponentProps<'thead'>) {
    return (
        <thead
            data-slot="data-table-header"
            className={cn(
                'bg-muted/40 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase [&_tr]:border-b',
                className,
            )}
            {...props}
        />
    );
}

function DataTableBody({ className, ...props }: ComponentProps<'tbody'>) {
    return (
        <tbody
            data-slot="data-table-body"
            className={cn('divide-y divide-border/80 bg-card', className)}
            {...props}
        />
    );
}

function DataTableRow({ className, ...props }: ComponentProps<'tr'>) {
    return (
        <tr
            data-slot="data-table-row"
            className={cn(
                'align-middle transition-colors hover:bg-accent/30 data-[state=selected]:bg-accent/50',
                className,
            )}
            {...props}
        />
    );
}

function DataTableHead({ className, ...props }: ComponentProps<'th'>) {
    return (
        <th
            data-slot="data-table-head"
            className={cn(
                'h-12 whitespace-nowrap px-4 py-3 text-left font-semibold',
                className,
            )}
            {...props}
        />
    );
}

function DataTableCell({ className, ...props }: ComponentProps<'td'>) {
    return (
        <td
            data-slot="data-table-cell"
            className={cn('px-4 py-4', className)}
            {...props}
        />
    );
}

function DataTableToolbar({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="data-table-toolbar"
            className={cn(
                'flex flex-col gap-2 border-b border-border bg-muted/15 px-6 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
            {...props}
        />
    );
}

export {
    DataTable,
    type DataTableColumn,
    DataTableBody,
    DataTableCell,
    DataTableHead,
    DataTableHeader,
    DataTableRow,
    DataTableToolbar,
};
