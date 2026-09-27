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
import { blockedIpTableColumns } from '@/features/access/ip-block-table-model';
import type {
    BlockedIpAddress,
    BlockedIpTableFilters,
} from '@/features/access/ip-block-table-model';
import { dashboard } from '@/routes';
import {
    create as createIpBlock,
    index as ipBlocksIndex,
} from '@/routes/access/ip-blocks';

type PaginatedBlockedIps = {
    data: BlockedIpAddress[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page?: number;
    links?: { url: string | null; label: string; active: boolean }[];
};

type Props = {
    blockedIpAddresses: PaginatedBlockedIps;
    filters: BlockedIpTableFilters;
    canUpdate?: boolean;
    canDelete?: boolean;
    canCreate?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
};

export default function IpBlocksPage({
    blockedIpAddresses,
    filters,
    canUpdate = false,
    canDelete = false,
    canCreate = false,
    canViewDeleted = false,
    canUpdateDeleted = false,
}: Props) {
    const pageSize =
        blockedIpAddresses.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const previousUrl = blockedIpAddresses.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = blockedIpAddresses.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;

    const tableActions = (
        <>
            <SearchFilterSheet
                action={ipBlocksIndex.url()}
                resetHref={ipBlocksIndex.url()}
                title="Search and filter IP addresses"
                description="Find an address, user, or reason and narrow the list by access status."
                activeFilterCount={
                    [
                        filters.search,
                        filters.status,
                        filters.from,
                        filters.to,
                        filters.recordStatus,
                    ].filter(Boolean).length
                }
                pageSize={pageSize}
                keyword={
                    <div className="grid gap-2">
                        <Label htmlFor="ip-block-search">Search</Label>
                        <Input
                            id="ip-block-search"
                            name="search"
                            defaultValue={filters.search}
                            placeholder="IP, user, or reason"
                            autoFocus
                        />
                    </div>
                }
                dateRange={
                    <div className="grid gap-2">
                        <Label htmlFor="ip-block-date-range">Date range</Label>
                        <DateRangePicker
                            id="ip-block-date-range"
                            from={filters.from}
                            to={filters.to}
                            fromName="from"
                            toName="to"
                            label="IP address date range"
                        />
                    </div>
                }
            >
                <div className="grid gap-2">
                    <Label htmlFor="ip-block-status">Status</Label>
                    <AdaptiveSelect
                        id="ip-block-status"
                        name="status"
                        multiple
                        defaultValue={filters.status}
                        placeholder="All addresses"
                        options={[
                            { value: '', label: 'All addresses' },
                            { value: 'active', label: 'Blocked' },
                            { value: 'inactive', label: 'Allowed' },
                        ]}
                    />
                </div>
                {canViewDeleted && (
                    <div className="grid gap-2">
                        <Label>Record status</Label>
                        <AdaptiveSelect
                            id="ip-block-record-status"
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
            {canCreate && (
                <ActionLink href={createIpBlock.url()}>
                    <Plus />
                    Add IP address
                </ActionLink>
            )}
        </>
    );

    return (
        <IndexPage
            title="Blocked IP addresses"
            description="Control which network addresses can reach FieldOps and keep a reversible history of each rule."
        >
            <IndexPageSection>
                <DataTable
                    caption="IP address access records"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={blockedIpAddresses.data}
                    tableColumns={() =>
                        blockedIpTableColumns({
                            filters,
                            canUpdate,
                            canDelete,
                            firstRowNumber: blockedIpAddresses.from ?? 1,
                        })
                    }
                    actions={tableActions}
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No IP addresses match the current filters.
                        </p>
                    }
                    addDefaultColumns
                    canUpdateDeleted={canUpdateDeleted}
                    excludeDefaultColumns={['status']}
                    defaultColumnSort={{
                        action: ipBlocksIndex.url(),
                        sort: filters.sort,
                        direction: filters.direction,
                        hidden: {
                            search: filters.search,
                            status: filters.status,
                            from: filters.from,
                            to: filters.to,
                            record_status: filters.recordStatus,
                        },
                    }}
                    columnVisibility={{
                        storageKey: 'access.ip-blocks.v2',
                        defaultVisibleKeys: [
                            'ip_address',
                            'status',
                            'user',
                            'reason',
                            'last_seen_at',
                            'created_at',
                            'updated_at',
                            'created_by',
                            'updated_by',
                            'record_status',
                        ],
                    }}
                    getRowKey={(rule) => rule.id}
                    pagination={{
                        currentPage: blockedIpAddresses.current_page,
                        lastPage: blockedIpAddresses.last_page,
                        total: blockedIpAddresses.total,
                        from: blockedIpAddresses.from,
                        to: blockedIpAddresses.to,
                        pageSize,
                        links: blockedIpAddresses.links,
                        itemLabel: 'IP addresses',
                        previousUrl,
                        nextUrl,
                    }}
                />
            </IndexPageSection>
        </IndexPage>
    );
}

IpBlocksPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Blocked IPs', href: ipBlocksIndex() },
    ],
};
