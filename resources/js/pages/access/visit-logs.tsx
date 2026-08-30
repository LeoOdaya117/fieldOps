import { Activity } from 'lucide-react';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import { visitLogTableColumns } from '@/features/access/visit-log-table-model';
import type {
    VisitLog,
    VisitLogTableFilters,
} from '@/features/access/visit-log-table-model';
import { dashboard } from '@/routes';
import { index as visitLogsIndex } from '@/routes/access/visit-logs';

type PaginatedVisitLogs = {
    data: VisitLog[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page?: number;
    links?: { url: string | null; label: string; active: boolean }[];
};

type Props = {
    logs: PaginatedVisitLogs;
    eventTypes: string[];
    outcomes: string[];
    filters: VisitLogTableFilters;
};

function optionLabel(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function VisitLogsPage({
    logs,
    eventTypes,
    outcomes,
    filters,
}: Props) {
    const pageSize = logs.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const previousUrl = logs.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = logs.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;

    return (
        <IndexPage
            title="Visit logs"
            description="Review successful logins and logouts with request and browser location context."
            actions={
                <SearchFilterSheet
                    action={visitLogsIndex.url()}
                    resetHref={visitLogsIndex.url()}
                    title="Search and filter visits"
                    description="Narrow activity by network address, user, location, event, outcome, status, or date."
                    activeFilterCount={
                        [
                            filters.ip,
                            filters.user,
                            filters.location,
                            filters.event,
                            filters.outcome,
                            filters.statusCode,
                            filters.from,
                            filters.to,
                        ].filter(Boolean).length
                    }
                    pageSize={pageSize}
                >
                    <div className="grid gap-2">
                        <label
                            htmlFor="visit-ip"
                            className="text-sm font-medium"
                        >
                            IP address
                        </label>
                        <Input
                            id="visit-ip"
                            name="ip"
                            defaultValue={filters.ip}
                            placeholder="203.0.113.10"
                            autoFocus
                        />
                    </div>
                    <div className="grid gap-2">
                        <label
                            htmlFor="visit-location"
                            className="text-sm font-medium"
                        >
                            Location
                        </label>
                        <Input
                            id="visit-location"
                            name="location"
                            defaultValue={filters.location}
                            placeholder="City, region, or country"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label
                            htmlFor="visit-user"
                            className="text-sm font-medium"
                        >
                            User
                        </label>
                        <Input
                            id="visit-user"
                            name="user"
                            defaultValue={filters.user}
                            placeholder="Name or email"
                        />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <label
                                htmlFor="visit-event"
                                className="text-sm font-medium"
                            >
                                Event
                            </label>
                            <select
                                id="visit-event"
                                name="event"
                                defaultValue={filters.event}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">All events</option>
                                {eventTypes.map((event) => (
                                    <option key={event} value={event}>
                                        {optionLabel(event)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label
                                htmlFor="visit-outcome"
                                className="text-sm font-medium"
                            >
                                Outcome
                            </label>
                            <select
                                id="visit-outcome"
                                name="outcome"
                                defaultValue={filters.outcome}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">All outcomes</option>
                                {outcomes.map((outcome) => (
                                    <option key={outcome} value={outcome}>
                                        {optionLabel(outcome)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <label
                            htmlFor="visit-status"
                            className="text-sm font-medium"
                        >
                            Response status
                        </label>
                        <Input
                            id="visit-status"
                            name="status_code"
                            inputMode="numeric"
                            defaultValue={filters.statusCode}
                            placeholder="403"
                        />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <label
                                htmlFor="visit-from"
                                className="text-sm font-medium"
                            >
                                From
                            </label>
                            <Input
                                id="visit-from"
                                name="from"
                                type="date"
                                defaultValue={filters.from}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label
                                htmlFor="visit-to"
                                className="text-sm font-medium"
                            >
                                To
                            </label>
                            <Input
                                id="visit-to"
                                name="to"
                                type="date"
                                defaultValue={filters.to}
                            />
                        </div>
                    </div>
                </SearchFilterSheet>
            }
        >
            <IndexPageSection>
                {logs.data.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                        <span className="flex size-10 items-center justify-center rounded-full bg-link/10 text-link">
                            <Activity className="size-5" />
                        </span>
                        <p className="text-sm font-medium">
                            No visits match the current filters.
                        </p>
                        <p className="max-w-md text-sm text-muted-foreground">
                            Login and logout activity will appear here after
                            users authenticate.
                        </p>
                    </div>
                ) : (
                    <DataTable
                        caption="FieldOps visit logs"
                        className="min-w-[1500px]"
                        containerClassName="rounded-none border-0 shadow-none ring-0"
                        scrollContainerClassName="px-4"
                        data={logs.data}
                        tableColumns={() =>
                            visitLogTableColumns({
                                filters,
                                firstRowNumber: logs.from ?? 1,
                            })
                        }
                        getRowKey={(log) => log.id}
                        pagination={{
                            currentPage: logs.current_page,
                            lastPage: logs.last_page,
                            total: logs.total,
                            from: logs.from,
                            to: logs.to,
                            pageSize,
                            links: logs.links,
                            itemLabel: 'visits',
                            previousUrl,
                            nextUrl,
                        }}
                    />
                )}
            </IndexPageSection>
        </IndexPage>
    );
}

VisitLogsPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Visit logs', href: visitLogsIndex() },
    ],
};
