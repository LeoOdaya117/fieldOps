import { Plus } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import { create as createAsset, index as assetsIndex } from '@/routes/assets';
import { ASSET_CONDITIONS } from '../types';
import type { AssetFilters, PaginatedAssets } from '../types';
import { assetTableColumns } from './asset-table-model';

export function AssetsList({
    assets,
    canCreate = false,
    canUpdate = false,
    canViewDeleted = false,
    canUpdateDeleted = false,
    filters,
}: {
    assets: PaginatedAssets;
    canCreate?: boolean;
    canUpdate?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
    filters: AssetFilters;
}) {
    const pageSize = assets.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const previousUrl = assets.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = assets.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;
    const tableActions = (
        <>
            <SearchFilterSheet
                action={assetsIndex.url()}
                resetHref={assetsIndex.url()}
                title="Search and filter assets"
                description="Find assets by code, name, category, or condition."
                activeFilterCount={
                    [
                        filters.search,
                        filters.category,
                        filters.condition,
                    ].filter(Boolean).length +
                    (filters.recordStatus && filters.recordStatus !== 'active'
                        ? 1
                        : 0)
                }
                pageSize={pageSize}
                keyword={
                    <div className="grid gap-2">
                        <Label htmlFor="asset-search">Search</Label>
                        <Input
                            id="asset-search"
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Code, name, or category"
                            autoFocus
                        />
                    </div>
                }
            >
                <div className="grid gap-2">
                    <Label htmlFor="asset-category-filter">Category</Label>
                    <Input
                        id="asset-category-filter"
                        name="category"
                        defaultValue={filters.category ?? ''}
                        maxLength={80}
                        placeholder="All categories"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="asset-condition-filter">
                        Operational condition
                    </Label>
                    <AdaptiveSelect
                        id="asset-condition-filter"
                        name="condition"
                        aria-label="Operational condition"
                        multiple={false}
                        defaultValue={filters.condition ?? ''}
                        options={[
                            { value: '', label: 'All conditions' },
                            ...ASSET_CONDITIONS.map(({ value, label }) => ({
                                value,
                                label,
                            })),
                        ]}
                    />
                </div>
                {canViewDeleted && (
                    <div className="grid gap-2">
                        <Label htmlFor="asset-record-status-filter">
                            Record status
                        </Label>
                        <AdaptiveSelect
                            id="asset-record-status-filter"
                            name="record_status"
                            aria-label="Record status"
                            multiple={false}
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
                <ActionLink href={createAsset.url()}>
                    <Plus />
                    Create asset
                </ActionLink>
            ) : null}
        </>
    );

    return (
        <IndexPage
            title="Assets"
            description="Browse and maintain the operational asset directory."
        >
            <IndexPageSection>
                <DataTable
                    caption="Asset directory"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={assets.data}
                    tableColumns={() =>
                        assetTableColumns({
                            filters,
                            canUpdate,
                            canUpdateDeleted,
                            firstRowNumber: assets.from ?? 1,
                        })
                    }
                    actions={tableActions}
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No assets match the current filters.
                        </p>
                    }
                    addDefaultColumns
                    canUpdateDeleted={canUpdateDeleted}
                    excludeDefaultColumns={['status']}
                    defaultColumnSort={{
                        action: assetsIndex.url(),
                        sort: filters.sort,
                        direction: filters.direction,
                        hidden: {
                            search: filters.search,
                            category: filters.category,
                            condition: filters.condition,
                            record_status: filters.recordStatus,
                        },
                    }}
                    columnVisibility={{
                        storageKey: 'assets.directory',
                        defaultVisibleKeys: [
                            'code',
                            'name',
                            'category',
                            'condition',
                            'record_status',
                            'updated_at',
                        ],
                    }}
                    getRowKey={(asset) => asset.id}
                    pagination={{
                        currentPage: assets.current_page,
                        lastPage: assets.last_page,
                        total: assets.total,
                        from: assets.from,
                        to: assets.to,
                        pageSize,
                        links: assets.links,
                        itemLabel: 'assets',
                        previousUrl,
                        nextUrl,
                    }}
                />
            </IndexPageSection>
        </IndexPage>
    );
}
