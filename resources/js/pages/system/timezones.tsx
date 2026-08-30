import { Plus } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
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
    canManage = false,
    filters = { search: '' },
}: {
    timezones: PaginatedReferenceData<Timezone>;
    canManage?: boolean;
    filters?: ReferenceDataFilters;
}) {
    const pageSize = timezones.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const previousUrl = timezones.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = timezones.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;

    return (
        <IndexPage
            title="Timezones"
            description="Maintain the IANA timezone directory used by FieldOps system settings."
            actions={
                <>
                    <SearchFilterSheet
                        action={timezonesIndex.url()}
                        resetHref={timezonesIndex.url()}
                        title="Search and filter timezones"
                        description="Find a timezone identifier."
                        activeFilterCount={filters.search ? 1 : 0}
                        pageSize={pageSize}
                    >
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
                    </SearchFilterSheet>
                    {canManage ? (
                        <ActionLink href={createTimezone.url()}>
                            <Plus />
                            Create timezone
                        </ActionLink>
                    ) : null}
                </>
            }
        >
            <IndexPageSection
                title="Timezone directory"
                description="Available IANA identifiers can be used by System Settings and future data-entry flows."
            >
                {timezones.data.length === 0 ? (
                    <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No timezones match the current filters.
                    </p>
                ) : (
                    <DataTable
                        caption="Timezone directory"
                        className="min-w-max"
                        containerClassName="rounded-none border-0 shadow-none ring-0"
                        scrollContainerClassName="px-4"
                        data={timezones.data}
                        tableColumns={() =>
                            timezoneTableColumns({
                                filters,
                                canManage,
                                firstRowNumber: timezones.from ?? 1,
                            })
                        }
                        addDefaultColumns
                        excludeDefaultColumns={['status']}
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
                )}
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
