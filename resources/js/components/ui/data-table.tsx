import type { ComponentProps, Key, ReactNode } from 'react';
import { SortableColumn } from '@/components/sortable-column';
import {
    DataTableColumnVisibility,
    useDataTableColumnVisibility,
} from '@/components/ui/data-table-column-visibility';
import type {
    DataTableColumnVisibilityOptions,
} from '@/components/ui/data-table-column-visibility';
import { TablePagination } from '@/components/ui/table-pagination';
import type { TablePaginationProps } from '@/components/ui/table-pagination';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { RecordStatusControl } from '@/components/ui/record-status-control';

type DataTableColumn<T> = {
    key: string;
    header: ReactNode;
    label?: string;
    hideable?: boolean;
    headerClassName?: string;
    cellClassName?: string;
    accessor?: keyof T | ((row: T, index: number) => ReactNode);
    cell?: (row: T, index: number) => ReactNode;
};

type DefaultColumnSortOptions = {
    action: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    sortParam?: string;
    directionParam?: string;
    hidden?: Record<string, string | readonly string[] | undefined>;
};

type DataTableProps<T = unknown> = ComponentProps<'table'> & {
    caption?: ReactNode;
    data?: readonly T[];
    addDefaultColumns?: boolean;
    excludeDefaultColumns?: readonly string[];
    defaultColumnSort?: DefaultColumnSortOptions;
    containerClassName?: string;
    scrollContainerClassName?: string;
    tableColumns?:
        | readonly DataTableColumn<T>[]
        | (() => readonly DataTableColumn<T>[]);
    columnVisibility?: DataTableColumnVisibilityOptions;
    toolbar?: ReactNode;
    actions?: ReactNode;
    emptyState?: ReactNode;
    pagination?: TablePaginationProps | null;
    getRowKey?: (row: T, index: number) => Key;
    getRowProps?: (
        row: T,
        index: number,
    ) => Omit<ComponentProps<'tr'>, 'children' | 'key'>;
    canUpdateDeleted?: boolean;
};

function DataTable<T>({
    caption,
    className,
    children,
    data,
    addDefaultColumns = false,
    excludeDefaultColumns = [],
    defaultColumnSort,
    containerClassName,
    scrollContainerClassName,
    tableColumns,
    columnVisibility,
    toolbar,
    actions,
    emptyState,
    pagination,
    getRowKey,
    getRowProps,
    canUpdateDeleted = false,
    ...props
}: DataTableProps<T>) {
    const configuredColumns =
        typeof tableColumns === 'function' ? tableColumns() : tableColumns;
    const columns =
        configuredColumns === undefined && children !== undefined
              ? undefined
            : addDefaultColumns
              ? mergeDefaultColumns(
                    configuredColumns ?? [],
                    excludeDefaultColumns,
                    defaultColumnSort,
                    canUpdateDeleted,
                )
              : configuredColumns;
    const hideableColumns =
        columns?.filter((column) => column.hideable !== false) ?? [];
    const columnVisibilityState = useDataTableColumnVisibility({
        storageKey: columnVisibility?.storageKey ?? null,
        columnKeys: hideableColumns.map((column) => column.key),
        defaultVisibleKeys: columnVisibility?.defaultVisibleKeys,
    });
    const canManageColumns =
        columnVisibility !== undefined &&
        columns !== undefined &&
        hideableColumns.length > 0;
    const visibleColumnKeys = new Set(columnVisibilityState.visibleKeys);
    const renderedColumns = canManageColumns
        ? columns?.filter(
              (column) =>
                  column.hideable === false ||
                  visibleColumnKeys.has(column.key),
          )
        : columns;
    const isDeclarative = columns !== undefined;
    const hasToolbarContent =
        toolbar !== undefined && toolbar !== null && toolbar !== false;
    const hasActionsContent =
        actions !== undefined && actions !== null && actions !== false;
    const hasDataTableToolbar =
        hasToolbarContent || hasActionsContent || canManageColumns;

    return (
        <div
            data-slot="data-table-container"
            className={cn(
                'relative w-full rounded-xl border border-border/80 bg-card shadow-sm ring-1 ring-border/20',
                containerClassName,
            )}
        >
            {hasDataTableToolbar ? (
                <DataTableToolbar
                    className={cn(
                        hasToolbarContent
                            ? 'flex-row flex-wrap items-center justify-between'
                            : 'items-end sm:justify-end',
                    )}
                >
                    {hasToolbarContent ? (
                        <div className="min-w-0 flex-1">{toolbar}</div>
                    ) : null}
                    {hasActionsContent || canManageColumns ? (
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {actions}
                            {canManageColumns ? (
                                <DataTableColumnVisibility
                                    columns={hideableColumns.map((column) => ({
                                        key: column.key,
                                        label: getColumnLabel(column),
                                    }))}
                                    visibleKeys={
                                        columnVisibilityState.visibleKeys
                                    }
                                    defaultVisibleKeys={
                                        columnVisibilityState.defaultVisibleKeys
                                    }
                                    onVisibleKeysChange={
                                        columnVisibilityState.setVisibleKeys
                                    }
                                    onReset={columnVisibilityState.reset}
                                />
                            ) : null}
                        </div>
                    ) : null}
                </DataTableToolbar>
            ) : null}
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
                                    {renderedColumns?.map((column) => (
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
                                {(data ?? []).length > 0
                                    ? (data ?? []).map((row, index) => {
                                          const rowProps = getRowProps?.(
                                              row,
                                              index,
                                          );

                                          return (
                                              <DataTableRow
                                                  key={
                                                      getRowKey?.(row, index) ??
                                                      index
                                                  }
                                                  {...rowProps}
                                              >
                                                  {renderedColumns?.map(
                                                      (column) => (
                                                          <DataTableCell
                                                              key={column.key}
                                                              className={
                                                                  column.cellClassName
                                                              }
                                                          >
                                                              {column.cell
                                                                  ? column.cell(
                                                                        row,
                                                                        index,
                                                                    )
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

                                                                            return value ==
                                                                                null
                                                                                ? null
                                                                                : String(
                                                                                      value,
                                                                                  );
                                                                        })()
                                                                      : null}
                                                          </DataTableCell>
                                                      ),
                                                  )}
                                              </DataTableRow>
                                          );
                                      })
                                    : emptyState !== undefined && (
                                          <DataTableRow>
                                              <DataTableCell
                                                  colSpan={
                                                      Math.max(
                                                          renderedColumns?.length ??
                                                              1,
                                                          1,
                                                      )
                                                  }
                                                  className="px-6 py-12 text-center"
                                              >
                                                  {emptyState}
                                              </DataTableCell>
                                          </DataTableRow>
                                      )}
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

function getColumnLabel<T>(column: DataTableColumn<T>): string {
    if (column.label) {
        return column.label;
    }

    if (typeof column.header === 'string' || typeof column.header === 'number') {
        return String(column.header);
    }

    return column.key
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDefaultDate(value: unknown) {
    return formatDateTime(value);
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

function defaultColumnHeader(
    label: string,
    sortKey: string,
    sortOptions?: DefaultColumnSortOptions,
) {
    return sortOptions ? (
        <SortableColumn
            {...sortOptions}
            label={label}
            sortKey={sortKey}
        />
    ) : (
        label
    );
}

function defaultTableColumns(
    sortOptions?: DefaultColumnSortOptions,
    canUpdateDeleted = false,
): DataTableColumn<unknown>[] {
    return [
        {
            key: 'created_at',
            header: defaultColumnHeader('Created', 'created_at', sortOptions),
            label: 'Created',
            cell: (row) => formatDefaultDate(readDefaultValue(row, 'created_at')),
        },
        {
            key: 'updated_at',
            header: defaultColumnHeader('Updated', 'updated_at', sortOptions),
            label: 'Updated',
            cell: (row) => formatDefaultDate(readDefaultValue(row, 'updated_at')),
        },
        {
            key: 'created_by',
            header: defaultColumnHeader('Created by', 'created_by', sortOptions),
            label: 'Created by',
            cell: (row) => formatActor(readDefaultValue(row, 'created_by')),
        },
        {
            key: 'updated_by',
            header: defaultColumnHeader('Updated by', 'updated_by', sortOptions),
            label: 'Updated by',
            cell: (row) => formatActor(readDefaultValue(row, 'updated_by')),
        },
        {
            key: 'status',
            header: defaultColumnHeader('Status', 'status', sortOptions),
            label: 'Status',
            cell: (row) => formatDefaultValue(readDefaultValue(row, 'status')),
        },
        {
            key: 'record_status',
            header: defaultColumnHeader(
                'Record status',
                'record_status',
                sortOptions,
            ),
            label: 'Record status',
            cell: (row) => (
                <RecordStatusControl
                    recordStatus={Number(readDefaultValue(row, 'record_status') ?? 0)}
                    label={String(readDefaultValue(row, 'name') ?? readDefaultValue(row, 'email') ?? readDefaultValue(row, 'display_name') ?? 'record')}
                    recordStatusUrl={readDefaultString(row, 'record_status_url') ?? readDefaultString(row, 'recordStatusUrl')}
                    canUpdateDeleted={canUpdateDeleted}
                />
            ),
        },
    ];
}

function readDefaultString(row: unknown, key: string): string | undefined {
    const value = readDefaultValue(row, key);

    return typeof value === 'string' ? value : undefined;
}

function mergeDefaultColumns<T>(
    columns: readonly DataTableColumn<T>[],
    excludeDefaultColumns: readonly string[],
    sortOptions?: DefaultColumnSortOptions,
    canUpdateDeleted = false,
) {
    const keys = new Set(columns.map((column) => column.key));
    const excludedKeys = new Set(excludeDefaultColumns);
    const defaults = defaultTableColumns(sortOptions, canUpdateDeleted).filter(
        (column) => !keys.has(column.key) && !excludedKeys.has(column.key),
    );

    let trailingNonHideableStart = columns.length;

    while (
        trailingNonHideableStart > 0 &&
        columns[trailingNonHideableStart - 1].hideable === false
    ) {
        trailingNonHideableStart -= 1;
    }

    return [
        ...columns.slice(0, trailingNonHideableStart),
        ...(defaults as DataTableColumn<T>[]),
        ...columns.slice(trailingNonHideableStart),
    ];
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
    type DataTableColumnVisibilityOptions,
    DataTableBody,
    DataTableCell,
    DataTableHead,
    DataTableHeader,
    DataTableRow,
    DataTableToolbar,
};
