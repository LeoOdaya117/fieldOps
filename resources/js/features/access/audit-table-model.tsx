import { CalendarClock, Eye, FileDiff, UserRound } from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { TableActionLink, TableActions } from '@/components/ui/table-actions';
import { show as showAuditEvent } from '@/routes/access/audit';

export type AuditEvent = {
    id: number;
    event: string;
    actor: { id: number; name: string; email: string } | null;
    subjectType: string | null;
    subjectId: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    occurredAt: string;
};

export type AuditTableFilters = {
    event: string;
    actor: string;
    subject: string;
    from: string;
    to: string;
    perPage?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

function ChangePreview({
    label,
    value,
}: {
    label: string;
    value: Record<string, unknown> | null;
}) {
    return (
        <div className="min-w-0 rounded-lg border border-border/80 bg-muted/15 p-2">
            <div className="mb-2 flex items-center gap-2">
                <FileDiff className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                    {label}
                </p>
            </div>
            <pre className="max-h-28 overflow-auto rounded-md bg-muted/60 p-2 text-xs leading-relaxed text-foreground">
                {JSON.stringify(value ?? {}, null, 2)}
            </pre>
        </div>
    );
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

type AuditTableOptions = {
    eventTypes: string[];
    filters: AuditTableFilters;
    firstEventNumber: number;
};

export function auditTableColumns({
    filters,
    firstEventNumber,
}: AuditTableOptions): DataTableColumn<AuditEvent>[] {
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'asc';

    return [
        {
            key: 'serial',
            header: '#',
            hideable: false,
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_event, index) => firstEventNumber + index,
        },
        {
            key: 'event',
            label: 'Event',
            header: (
                <SortableColumn
                    action="/access/audit"
                    label="Event"
                    sortKey="event"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        event: filters.event,
                        actor: filters.actor,
                        subject: filters.subject,
                        from: filters.from,
                        to: filters.to,
                    }}
                />
            ),
            headerClassName: 'px-6',
            cellClassName: 'px-6',
            cell: (event) => (
                <Badge variant="secondary" className="font-mono text-[11px]">
                    {event.event}
                </Badge>
            ),
        },
        {
            key: 'actor',
            label: 'Actor',
            header: (
                <SortableColumn
                    action="/access/audit"
                    label="Actor"
                    sortKey="actor"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        event: filters.event,
                        actor: filters.actor,
                        subject: filters.subject,
                        from: filters.from,
                        to: filters.to,
                    }}
                />
            ),
            cell: (event) =>
                event.actor ? (
                    <div className="flex items-center gap-3">
                        <Avatar className="size-8 rounded-lg">
                            <AvatarFallback className="rounded-lg bg-link/10 text-[11px] font-semibold text-link">
                                {initials(event.actor.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium">
                                {event.actor.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                {event.actor.email}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                            <UserRound className="size-4" />
                        </span>
                        System
                    </div>
                ),
        },
        {
            key: 'subject',
            label: 'Subject',
            header: (
                <SortableColumn
                    action="/access/audit"
                    label="Subject"
                    sortKey="subject_type"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        event: filters.event,
                        actor: filters.actor,
                        subject: filters.subject,
                        from: filters.from,
                        to: filters.to,
                    }}
                />
            ),
            cell: (event) =>
                event.subjectType ? (
                    <Badge variant="outline" className="font-mono text-[11px]">
                        {event.subjectType} #{event.subjectId}
                    </Badge>
                ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                ),
        },
        {
            key: 'ip_address',
            header: 'Source IP',
            label: 'Source IP',
            cell: (event) => (
                <code className="font-mono text-xs text-muted-foreground">
                    {event.ipAddress ?? '—'}
                </code>
            ),
        },
        {
            key: 'occurred',
            label: 'Occurred',
            header: (
                <SortableColumn
                    action="/access/audit"
                    label="Occurred"
                    sortKey="occurred_at"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        event: filters.event,
                        actor: filters.actor,
                        subject: filters.subject,
                        from: filters.from,
                        to: filters.to,
                    }}
                />
            ),
            cell: (event) => (
                <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <CalendarClock className="size-3.5 text-muted-foreground" />
                    <time dateTime={event.occurredAt}>
                        {new Date(event.occurredAt).toLocaleString()}
                    </time>
                </div>
            ),
        },
        {
            key: 'changes',
            header: 'Changes',
            label: 'Changes',
            headerClassName: 'min-w-[380px] px-6',
            cellClassName: 'px-6',
            cell: (event) => (
                <div className="grid gap-3 sm:grid-cols-2">
                    <ChangePreview label="Before" value={event.before} />
                    <ChangePreview label="After" value={event.after} />
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            hideable: false,
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (event) => (
                <TableActions label={`Actions for audit event ${event.id}`}>
                    <TableActionLink href={showAuditEvent.url(event.id)}>
                        <Eye />
                        View
                    </TableActionLink>
                </TableActions>
            ),
        },
    ];
}
