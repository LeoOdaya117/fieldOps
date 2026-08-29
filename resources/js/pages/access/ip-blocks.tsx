import { Plus } from 'lucide-react';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import { ActionLink } from '@/components/action-link';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
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
    canManage?: boolean;
};

export default function IpBlocksPage({
    blockedIpAddresses,
    filters,
    canManage = false,
}: Props) {
    const pageSize =
        blockedIpAddresses.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const previousUrl = blockedIpAddresses.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = blockedIpAddresses.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;

    return (
        <IndexPage
            title="Blocked IP addresses"
            description="Control which network addresses can reach FieldOps and keep a reversible history of each rule."
            actions={
                <>
                    <SearchFilterSheet
                        action={ipBlocksIndex.url()}
                        resetHref={ipBlocksIndex.url()}
                        title="Search and filter IP addresses"
                        description="Find an address, user, or reason and narrow the list by access status."
                        activeFilterCount={
                            [filters.search, filters.status].filter(Boolean)
                                .length
                        }
                        pageSize={pageSize}
                    >
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
                        <div className="grid gap-2">
                            <Label htmlFor="ip-block-status">Status</Label>
                            <select
                                id="ip-block-status"
                                name="status"
                                defaultValue={filters.status}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">All addresses</option>
                                <option value="active">Blocked</option>
                                <option value="inactive">Allowed</option>
                            </select>
                        </div>
                    </SearchFilterSheet>
                    {canManage && (
                        <ActionLink href={createIpBlock.url()}>
                            <Plus />
                            Add IP address
                        </ActionLink>
                    )}
                </>
            }
        >
            <IndexPageSection
                title="IP address directory"
                description="Addresses are recorded during authentication with the latest user observed from each address. Open an address to review its history and change its access status."
            >
                {blockedIpAddresses.data.length === 0 ? (
                    <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No IP addresses match the current filters.
                    </p>
                ) : (
                    <DataTable
                        caption="IP address access records"
                        className="min-w-[1220px]"
                        containerClassName="rounded-none border-0 shadow-none ring-0"
                        scrollContainerClassName="px-4"
                        data={blockedIpAddresses.data}
                        tableColumns={() =>
                            blockedIpTableColumns({
                                filters,
                                canManage,
                                firstRowNumber: blockedIpAddresses.from ?? 1,
                            })
                        }
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
                )}
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
