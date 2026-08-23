import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import { auditTableColumns } from '@/features/access/audit-table-model';
import type {
    AuditEvent,
    AuditTableFilters,
} from '@/features/access/audit-table-model';
import { dashboard } from '@/routes';
import { index as auditIndex } from '@/routes/access/audit';

type PaginatedEvents = {
    data: AuditEvent[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page?: number;
    links?: { url: string | null; label: string; active: boolean }[];
};

type Props = {
    events: PaginatedEvents;
    eventTypes: string[];
    filters: AuditTableFilters;
};

export default function AuditPage({ events, eventTypes, filters }: Props) {
    const previousUrl = events.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = events.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;
    const pageSize = events.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;

    const tableColumns = () =>
        auditTableColumns({
            eventTypes,
            filters,
            firstEventNumber: events.from ?? 1,
        });

    return (
        <IndexPage
            title="Access audit"
            description="Review role, invitation, and account-status changes."
            actions={
                <SearchFilterSheet
                    action="/access/audit"
                    resetHref="/access/audit"
                    title="Search and filter audit events"
                    description="Search by actor or subject and narrow events by date or event type."
                    activeFilterCount={
                        [
                            filters.event,
                            filters.actor,
                            filters.subject,
                            filters.from,
                            filters.to,
                        ].filter(Boolean).length
                    }
                    pageSize={pageSize}
                >
                    <div className="grid gap-2">
                        <label
                            htmlFor="audit-actor"
                            className="text-sm font-medium"
                        >
                            Actor
                        </label>
                        <input
                            id="audit-actor"
                            name="actor"
                            defaultValue={filters.actor}
                            placeholder="Name or email"
                            autoFocus
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label
                            htmlFor="audit-subject"
                            className="text-sm font-medium"
                        >
                            Subject
                        </label>
                        <input
                            id="audit-subject"
                            name="subject"
                            defaultValue={filters.subject}
                            placeholder="Type or ID"
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <label
                                htmlFor="audit-from"
                                className="text-sm font-medium"
                            >
                                From
                            </label>
                            <input
                                id="audit-from"
                                name="from"
                                type="date"
                                defaultValue={filters.from}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label
                                htmlFor="audit-to"
                                className="text-sm font-medium"
                            >
                                To
                            </label>
                            <input
                                id="audit-to"
                                name="to"
                                type="date"
                                defaultValue={filters.to}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <label
                            htmlFor="audit-event"
                            className="text-sm font-medium"
                        >
                            Event type
                        </label>
                        <select
                            id="audit-event"
                            name="event"
                            defaultValue={filters.event}
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">All events</option>
                            {eventTypes.map((event) => (
                                <option key={event} value={event}>
                                    {event}
                                </option>
                            ))}
                        </select>
                    </div>
                </SearchFilterSheet>
            }
        >
            <IndexPageSection>
                {events.data.length === 0 ? (
                    <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No access events recorded.
                    </p>
                ) : (
                    <DataTable
                        caption="FieldOps access audit events"
                        className="min-w-[1160px]"
                        containerClassName="rounded-none border-0 shadow-none ring-0"
                        scrollContainerClassName="px-4"
                        data={events.data}
                        tableColumns={tableColumns}
                        getRowKey={(event) => event.id}
                        pagination={{
                            currentPage: events.current_page,
                            lastPage: events.last_page,
                            total: events.total,
                            from: events.from,
                            to: events.to,
                            pageSize,
                            itemLabel: 'events',
                            previousUrl,
                            nextUrl,
                        }}
                    />
                )}
            </IndexPageSection>
        </IndexPage>
    );
}

AuditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Access audit', href: auditIndex() },
    ],
};
