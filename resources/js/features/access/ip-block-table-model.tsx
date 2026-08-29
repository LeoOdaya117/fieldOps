import {
    CalendarClock,
    CircleCheck,
    CircleSlash2,
    Eye,
    Pencil,
    Trash2,
    UserRound,
} from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import {
    TableActionForm,
    TableActionLink,
    TableActions,
} from '@/components/ui/table-actions';
import {
    destroy as deleteIpBlock,
    edit as editIpBlock,
    index as ipBlocksIndex,
    show as showIpBlock,
} from '@/routes/access/ip-blocks';

export type SecurityActor = {
    id: number;
    name: string;
    email: string;
};

export type BlockedIpAddress = {
    id: number;
    ipAddress: string;
    user: SecurityActor | null;
    reason: string | null;
    isActive: boolean;
    blockedAt: string | null;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    blockedBy: SecurityActor | null;
    unblockedAt: string | null;
    unblockedBy: SecurityActor | null;
};

export type BlockedIpTableFilters = {
    search: string;
    status: string;
    perPage?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

type BlockedIpTableOptions = {
    filters: BlockedIpTableFilters;
    canManage: boolean;
    firstRowNumber: number;
};

function formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleString() : '—';
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function blockedIpTableColumns({
    filters,
    canManage,
    firstRowNumber,
}: BlockedIpTableOptions): DataTableColumn<BlockedIpAddress>[] {
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'asc';
    const hidden = { search: filters.search, status: filters.status };

    return [
        {
            key: 'serial',
            header: '#',
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_rule, index) => firstRowNumber + index,
        },
        {
            key: 'ip_address',
            header: (
                <SortableColumn
                    action={ipBlocksIndex.url()}
                    label="IP address"
                    sortKey="ip_address"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cellClassName: 'px-6',
            cell: (rule) => (
                <code className="rounded bg-muted px-2 py-1 font-mono text-sm text-foreground">
                    {rule.ipAddress}
                </code>
            ),
        },
        {
            key: 'status',
            header: (
                <SortableColumn
                    action={ipBlocksIndex.url()}
                    label="Status"
                    sortKey="is_active"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (rule) => (
                <Badge
                    variant="outline"
                    className={
                        rule.isActive
                            ? 'border-destructive/30 bg-destructive/10 text-destructive'
                            : 'border-success/30 bg-success/10 text-success'
                    }
                >
                    {rule.isActive ? (
                        <CircleSlash2 aria-hidden="true" />
                    ) : (
                        <CircleCheck aria-hidden="true" />
                    )}
                    {rule.isActive ? 'Blocked' : 'Allowed'}
                </Badge>
            ),
        },
        {
            key: 'user',
            header: 'Observed user',
            headerClassName: 'px-6',
            cellClassName: 'px-6',
            cell: (rule) =>
                rule.user ? (
                    <div className="flex min-w-[210px] items-center gap-3">
                        <Avatar className="size-8 rounded-lg">
                            <AvatarFallback className="rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                                {initials(rule.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium">
                                {rule.user.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                                {rule.user.email}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UserRound className="size-4" />
                        No user recorded
                    </span>
                ),
        },
        {
            key: 'reason',
            header: 'Reason',
            cell: (rule) => (
                <span className="block max-w-xs text-sm text-muted-foreground">
                    {rule.reason ?? 'No reason provided.'}
                </span>
            ),
        },
        {
            key: 'last_seen_at',
            header: (
                <SortableColumn
                    action={ipBlocksIndex.url()}
                    label="Last seen"
                    sortKey="last_seen_at"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (rule) => (
                <div className="flex min-w-[190px] items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock className="size-3.5 shrink-0" />
                    <span>
                        {formatDate(rule.lastSeenAt ?? rule.firstSeenAt)}
                    </span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (rule) => (
                <TableActions label={`Actions for ${rule.ipAddress}`}>
                    <TableActionLink href={showIpBlock.url(rule.id)}>
                        <Eye />
                        View
                    </TableActionLink>
                    {canManage && (
                        <>
                            <TableActionLink href={editIpBlock.url(rule.id)}>
                                <Pencil />
                                Edit
                            </TableActionLink>
                            <TableActionForm
                                action={deleteIpBlock.url(rule.id)}
                                method="delete"
                                destructive
                                confirmation={{
                                    title: `Delete ${rule.ipAddress}?`,
                                    description:
                                        'This removes the IP address record and its block rule. Future authentication from this address will create a new allowed record.',
                                    confirmLabel: 'Delete',
                                }}
                            >
                                <Trash2 />
                                Delete
                            </TableActionForm>
                        </>
                    )}
                </TableActions>
            ),
        },
    ];
}
