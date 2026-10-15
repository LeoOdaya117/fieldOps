import { Plus } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import { timezoneTableColumns } from '@/features/system/reference-data-table-model';
import type {
    PaginatedReferenceData,
    ReferenceDataFilters,
    Timezone,
} from '@/features/system/types';
import { dashboard } from '@/routes';
import {
    create as createTimezone,
    index as timezonesIndex,
} from '@/routes/system/timezones';

export default function TimezonesPage({
    timezones,
    canUpdate = false,
    canDelete = false,
    canCreate = false,
    canViewDeleted = false,
    canUpdateDeleted = false,
    filters = { search: '' },
}: {
    timezones: PaginatedReferenceData<Timezone>;
    canUpdate?: boolean;
    canDelete?: boolean;
    canCreate?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
    filters?: ReferenceDataFilters;
}) {
    const pageSize = timezones.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const previousUrl = timezones.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = timezones.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;

    const tableActions = (
        <>
            <SearchFilterSheet
                action={timezonesIndex.url()}
                resetHref={timezonesIndex.url()}
                title="Search and filter timezones"
                description="Find a timezone identifier."
                activeFilterCount={
                    [
                        filters.search,
                        filters.from,
                        filters.to,
                        filters.recordStatus,
                    ].filter(Boolean).length
                }
                pageSize={pageSize}
                keyword={
                    <div className="grid gap-2">
                        <Label htmlFor="timezone-search">Search</Label>
                        <Input
                            id="timezone-search"
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Asia, Pacific, UTC..."
                            autoFocus
                        />
                    </div>
                }
                dateRange={
                    <div className="grid gap-2">
                        <Label htmlFor="timezone-date-range">Date range</Label>
                        <DateRangePicker
                            id="timezone-date-range"
                            from={filters.from}
                            to={filters.to}
                            fromName="from"
                            toName="to"
                            label="Timezone date range"
                        />
                    </div>
                }
            >
                {canViewDeleted && (
                    <div className="grid gap-2">
                        <Label>Record status</Label>
                        <AdaptiveSelect
                            id="timezone-record-status"
                            name="record_status"
                            aria-label="Record status"
                            multiple
                            defaultValue={filters.recordStatus ?? 'active'}
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                            ]}
                        />
                    </div>
                )}
            </SearchFilterSheet>
            {canCreate ? (
                <ActionLink href={createTimezone.url()}>
                    <Plus />
                    Create timezone
                </ActionLink>
            ) : null}
        </>
    );

    return (
        <IndexPage
            title="Timezones"
            description="Maintain the IANA timezone directory used by FieldOps system settings."
        >
            <IndexPageSection>
                <DataTable
                    caption="Timezone directory"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={timezones.data}
                    tableColumns={() =>
                        timezoneTableColumns({
                            filters,
                            canUpdate,
                            canDelete,
                            canUpdateDeleted,
                            firstRowNumber: timezones.from ?? 1,
                        })
                    }
                    actions={tableActions}
                    exportOptions={{
                        dataset: 'timezones',
                        permissionNamespaces: ['timezones'],
                        filters: {
                            search: filters.search,
                            from: filters.from,
                            to: filters.to,
                            record_status: filters.recordStatus,
                            sort: filters.sort,
                            direction: filters.direction,
                        },
                    }}
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No timezones match the current filters.
                        </p>
                    }
                    addDefaultColumns
                    canUpdateDeleted={canUpdateDeleted}
                    excludeDefaultColumns={['status']}
                    defaultColumnSort={{
                        action: timezonesIndex.url(),
                        sort: filters.sort,
                        direction: filters.direction,
                        hidden: {
                            search: filters.search,
                            from: filters.from,
                            to: filters.to,
                            record_status: filters.recordStatus,
                        },
                    }}
                    columnVisibility={{
                        storageKey: 'system.timezones',
                        defaultVisibleKeys: [
                            'name',
                            'created_at',
                            'updated_at',
                            'created_by',
                            'updated_by',
                            'record_status',
                        ],
                    }}
                    getRowKey={(timezone) => timezone.id}
                    pagination={{
                        currentPage: timezones.current_page,
                        lastPage: timezones.last_page,
                        total: timezones.total,
                        from: timezones.from,
                        to: timezones.to,
                        pageSize,
                        links: timezones.links,
                        itemLabel: 'timezones',
                        previousUrl,
                        nextUrl,
                    }}
                />
            </IndexPageSection>
        </IndexPage>
    );
}

TimezonesPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Timezones', href: timezonesIndex() },
    ],
};
