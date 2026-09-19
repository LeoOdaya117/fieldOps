import { Plus } from 'lucide-react';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import { ActionLink } from '@/components/action-link';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
    canManage = false,
    canCreate = false,
    filters = { search: '' },
}: {
    countries: PaginatedReferenceData<Country>;
    canManage?: boolean;
    canCreate?: boolean;
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
                    [filters.search, filters.from, filters.to].filter(Boolean)
                        .length
                }
                pageSize={pageSize}
            >
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
                            canManage,
                            firstRowNumber: countries.from ?? 1,
                        })
                    }
                    actions={tableActions}
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No countries match the current filters.
                        </p>
                    }
                    addDefaultColumns
                    excludeDefaultColumns={['status']}
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
