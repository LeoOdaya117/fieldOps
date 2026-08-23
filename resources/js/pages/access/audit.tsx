import { Head } from '@inertiajs/react';
import SearchFilterSheet from '@/components/search-filter-sheet';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination } from '@/components/ui/table-pagination';
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

    const tableColumns = () =>
        auditTableColumns({
            eventTypes,
            filters,
            firstEventNumber: events.from ?? 1,
        });

    return (
        <>
            <Head title="Access audit" />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Access audit"
                        description="Review role, invitation, and account-status changes."
                    />
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
                </div>
                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Audit events</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Events are immutable and can only be reviewed.
                            </p>
                        </div>
                        <Badge variant="outline">
                            {events.total}{' '}
                            {events.total === 1 ? 'event' : 'events'}
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        {events.data.length === 0 ? (
                            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                                No access events recorded.
                            </p>
                        ) : (
                            <DataTable
                                caption="FieldOps access audit events"
                                className="min-w-[1160px]"
                                containerClassName="rounded-none border-0 shadow-none ring-0"
                                data={events.data}
                                tableColumns={tableColumns}
                                getRowKey={(event) => event.id}
                            />
                        )}
                        <TablePagination
                            currentPage={events.current_page}
                            lastPage={events.last_page}
                            total={events.total}
                            from={events.from}
                            to={events.to}
                            itemLabel="events"
                            previousUrl={previousUrl}
                            nextUrl={nextUrl}
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

AuditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Access audit', href: auditIndex() },
    ],
};
