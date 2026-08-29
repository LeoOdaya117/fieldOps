import { Eye, Globe2, UserRound } from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { TableActionLink, TableActions } from '@/components/ui/table-actions';
import {
    index as visitLogsIndex,
    show as showVisitLog,
} from '@/routes/access/visit-logs';

export type VisitLogUser = {
    id: number;
    name: string;
    email: string;
};

export type VisitLog = {
    id: number;
    user: VisitLogUser | null;
    eventType: string;
    outcome: string | null;
    ipAddress: string;
    userAgent: string | null;
    method: string;
    routeName: string | null;
    path: string;
    statusCode: number | null;
    occurredAt: string;
};

export type VisitLogTableFilters = {
    ip: string;
    user: string;
    event: string;
    outcome: string;
    statusCode: string;
    from: string;
    to: string;
    perPage?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

type VisitLogTableOptions = {
    filters: VisitLogTableFilters;
    firstRowNumber: number;
};

function initials(name: string): string {
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function label(value: string | null): string {
    return value
        ? value
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (character) => character.toUpperCase())
        : '—';
}

export function visitLogTableColumns({
    filters,
    firstRowNumber,
}: VisitLogTableOptions): DataTableColumn<VisitLog>[] {
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'desc';
    const hidden = {
        ip: filters.ip,
        user: filters.user,
        event: filters.event,
        outcome: filters.outcome,
        status_code: filters.statusCode,
        from: filters.from,
        to: filters.to,
    };

    return [
        {
            key: 'serial',
            header: '#',
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_log, index) => firstRowNumber + index,
        },
        {
            key: 'occurred_at',
            header: (
                <SortableColumn
                    action={visitLogsIndex.url()}
                    label="Occurred"
                    sortKey="occurred_at"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (log) => (
                <time
                    className="block min-w-[190px] text-sm whitespace-nowrap"
                    dateTime={log.occurredAt}
                >
                    {new Date(log.occurredAt).toLocaleString()}
                </time>
            ),
        },
        {
            key: 'ip_address',
            header: (
                <SortableColumn
                    action={visitLogsIndex.url()}
                    label="IP address"
                    sortKey="ip_address"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (log) => (
                <div className="flex min-w-[150px] items-center gap-2">
                    <Globe2 className="size-3.5 text-muted-foreground" />
                    <code className="font-mono text-xs">{log.ipAddress}</code>
                </div>
            ),
        },
        {
            key: 'user',
            header: 'User',
            cell: (log) =>
                log.user ? (
                    <div className="flex min-w-[210px] items-center gap-3">
                        <Avatar className="size-8 rounded-lg">
                            <AvatarFallback className="rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                                {initials(log.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium">
                                {log.user.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                {log.user.email}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserRound className="size-4" />
                        Anonymous
                    </span>
                ),
        },
        {
            key: 'event',
            header: 'Event',
            cell: (log) => (
                <div className="min-w-[150px] space-y-1">
                    <Badge variant="secondary">{label(log.eventType)}</Badge>
                    <div className="text-xs text-muted-foreground">
                        {label(log.outcome)}
                    </div>
                </div>
            ),
        },
        {
            key: 'request',
            header: 'Request',
            cell: (log) => (
                <div className="min-w-[260px]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <Badge
                            variant="outline"
                            className="font-mono text-[10px]"
                        >
                            {log.method}
                        </Badge>
                        <span className="truncate">
                            {log.routeName ?? 'Unmatched route'}
                        </span>
                    </div>
                    <code className="mt-1 block truncate text-xs text-foreground">
                        {log.path}
                    </code>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (log) => (
                <Badge
                    variant={
                        log.statusCode !== null && log.statusCode >= 400
                            ? 'destructive'
                            : 'outline'
                    }
                    className="font-mono"
                >
                    {log.statusCode ?? '—'}
                </Badge>
            ),
        },
        {
            key: 'user_agent',
            header: 'User agent',
            cell: (log) => (
                <span
                    className="block max-w-[280px] truncate text-xs text-muted-foreground"
                    title={log.userAgent ?? undefined}
                >
                    {log.userAgent ?? '—'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (log) => (
                <TableActions label={`Actions for visit log ${log.id}`}>
                    <TableActionLink href={showVisitLog.url(log.id)}>
                        <Eye />
                        View
                    </TableActionLink>
                </TableActions>
            ),
        },
    ];
}
