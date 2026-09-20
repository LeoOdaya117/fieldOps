import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { DataTable } from '@/components/ui/data-table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { FormSelect } from '@/components/ui/form-select';
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

    const tableActions = (
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
            keyword={
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
            }
            dateRange={
                <div className="grid gap-2">
                    <label
                        htmlFor="audit-date-range"
                        className="text-sm font-medium"
                    >
                        Date range
                    </label>
                    <DateRangePicker
                        id="audit-date-range"
                        from={filters.from}
                        to={filters.to}
                        fromName="from"
                        toName="to"
                        label="Audit date range"
                    />
                </div>
            }
        >
            <div className="grid gap-2">
                <label htmlFor="audit-subject" className="text-sm font-medium">
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
            <div className="grid gap-2">
                <label htmlFor="audit-event" className="text-sm font-medium">
                    Event type
                </label>
                <FormSelect
                    id="audit-event"
                    name="event"
                    defaultValue={filters.event}
                    options={[
                        { value: '', label: 'All events' },
                        ...eventTypes.map((event) => ({
                            value: event,
                            label: event,
                        })),
                    ]}
                />
            </div>
        </SearchFilterSheet>
    );

    return (
        <IndexPage
            title="Access audit"
            description="Review role, invitation, and account-status changes."
        >
            <IndexPageSection>
                <DataTable
                    caption="FieldOps access audit events"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={events.data}
                    tableColumns={tableColumns}
                    actions={tableActions}
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No access events recorded.
                        </p>
                    }
                    columnVisibility={{
                        storageKey: 'access.audit',
                        defaultVisibleKeys: [
                            'event',
                            'actor',
                            'subject',
                            'ip_address',
                            'occurred',
                            'changes',
                        ],
                    }}
                    getRowKey={(event) => event.id}
                    pagination={{
                        currentPage: events.current_page,
                        lastPage: events.last_page,
                        total: events.total,
                        from: events.from,
                        to: events.to,
                        pageSize,
                        links: events.links,
                        itemLabel: 'events',
                        previousUrl,
                        nextUrl,
                    }}
                />
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
