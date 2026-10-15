import { Plus } from 'lucide-react';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import { ActionLink } from '@/components/action-link';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import { countryTableColumns } from '@/features/system/reference-data-table-model';
import type {
    Country,
    PaginatedReferenceData,
    ReferenceDataFilters,
} from '@/features/system/types';
import { dashboard } from '@/routes';
import {
    create as createCountry,
    index as countriesIndex,
} from '@/routes/system/countries';

export default function CountriesPage({
    countries,
    canUpdate = false,
    canDelete = false,
    canCreate = false,
    canViewDeleted = false,
    canUpdateDeleted = false,
    filters = { search: '' },
}: {
    countries: PaginatedReferenceData<Country>;
    canUpdate?: boolean;
    canDelete?: boolean;
    canCreate?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
    filters?: ReferenceDataFilters;
}) {
    const pageSize = countries.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const previousUrl = countries.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = countries.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;

    const tableActions = (
        <>
            <SearchFilterSheet
                action={countriesIndex.url()}
                resetHref={countriesIndex.url()}
                title="Search and filter countries"
                description="Find a country by code or name."
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
                        <Label htmlFor="country-search">Search</Label>
                        <Input
                            id="country-search"
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Code or country name"
                            autoFocus
                        />
                    </div>
                }
                dateRange={
                    <div className="grid gap-2">
                        <Label htmlFor="country-date-range">Date range</Label>
                        <DateRangePicker
                            id="country-date-range"
                            from={filters.from}
                            to={filters.to}
                            fromName="from"
                            toName="to"
                            label="Country date range"
                        />
                    </div>
                }
            >
                {canViewDeleted && (
                    <div className="grid gap-2">
                        <Label>Record status</Label>
                        <AdaptiveSelect
                            id="country-record-status"
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
                <ActionLink href={createCountry.url()}>
                    <Plus />
                    Create country
                </ActionLink>
            ) : null}
        </>
    );

    return (
        <IndexPage
            title="Countries"
            description="Maintain the country directory used by FieldOps data-entry workflows."
        >
            <IndexPageSection>
                <DataTable
                    caption="Country directory"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={countries.data}
                    tableColumns={() =>
                        countryTableColumns({
                            filters,
                            canUpdate,
                            canDelete,
                            canUpdateDeleted,
                            firstRowNumber: countries.from ?? 1,
                        })
                    }
                    actions={tableActions}
                    exportOptions={{
                        dataset: 'countries',
                        permissionNamespaces: ['countries'],
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
                            No countries match the current filters.
                        </p>
                    }
                    addDefaultColumns
                    canUpdateDeleted={canUpdateDeleted}
                    excludeDefaultColumns={['status']}
                    defaultColumnSort={{
                        action: countriesIndex.url(),
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
                        storageKey: 'system.countries',
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
                    getRowKey={(country) => country.id}
                    pagination={{
                        currentPage: countries.current_page,
                        lastPage: countries.last_page,
                        total: countries.total,
                        from: countries.from,
                        to: countries.to,
                        pageSize,
                        links: countries.links,
                        itemLabel: 'countries',
                        previousUrl,
                        nextUrl,
                    }}
                />
            </IndexPageSection>
        </IndexPage>
    );
}

CountriesPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Countries', href: countriesIndex() },
    ],
};
