import {
    CalendarClock,
    CircleCheck,
    CircleSlash2,
    GlobeLock,
    Pencil,
    Trash2,
    UserRound,
} from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { DetailsActionForm, DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import { Badge } from '@/components/ui/badge';
import type {
    BlockedIpAddress,
    SecurityActor,
} from '@/features/access/ip-block-table-model';
import { dashboard } from '@/routes';
import {
    activate as activateIpBlock,
    deactivate as deactivateIpBlock,
    destroy as deleteIpBlock,
    edit as editIpBlock,
    index as ipBlocksIndex,
} from '@/routes/access/ip-blocks';

type IpBlockDetails = BlockedIpAddress & {
    blockedBy: SecurityActor | null;
    unblockedBy: SecurityActor | null;
};

function formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleString() : 'Not recorded';
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    return (
        <Badge
            variant="outline"
            className={
                isActive
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-success/30 bg-success/10 text-success'
            }
        >
            <span className="size-1.5 rounded-full bg-current" />
            {isActive ? 'Blocked' : 'Allowed'}
        </Badge>
    );
}

function Actor({ actor }: { actor: SecurityActor | null }) {
    return actor ? (
        <div>
            <p className="font-medium">{actor.name}</p>
            <p className="text-xs text-muted-foreground">{actor.email}</p>
        </div>
    ) : (
        <span className="text-muted-foreground">Not recorded</span>
    );
}

export default function IpBlockShowPage({
    blockedIpAddress,
    canManage,
}: {
    blockedIpAddress: IpBlockDetails;
    canManage: boolean;
}) {
    return (
        <DetailsPage
            title={blockedIpAddress.ipAddress}
            description="Review the access rule, observed account, and block history for this address."
            backHref={ipBlocksIndex.url()}
            backLabel="Back to IP addresses"
            actions={
                canManage ? (
                    <>
                        <ActionLink href={editIpBlock.url(blockedIpAddress.id)}>
                            <Pencil />
                            Edit
                        </ActionLink>
                        <DetailsActionForm
                            action={
                                blockedIpAddress.isActive
                                    ? deactivateIpBlock.url(blockedIpAddress.id)
                                    : activateIpBlock.url(blockedIpAddress.id)
                            }
                            method="patch"
                            variant={
                                blockedIpAddress.isActive
                                    ? 'outline'
                                    : 'default'
                            }
                            confirmation={{
                                title: blockedIpAddress.isActive
                                    ? `Allow ${blockedIpAddress.ipAddress}?`
                                    : `Block ${blockedIpAddress.ipAddress}?`,
                                description: blockedIpAddress.isActive
                                    ? 'Future requests from this address will be allowed.'
                                    : 'Future requests from this address will receive access denied.',
                                confirmLabel: blockedIpAddress.isActive
                                    ? 'Allow'
                                    : 'Block',
                            }}
                        >
                            {blockedIpAddress.isActive ? (
                                <CircleCheck />
                            ) : (
                                <CircleSlash2 />
                            )}
                            {blockedIpAddress.isActive ? 'Allow' : 'Block'}
                        </DetailsActionForm>
                        <DetailsActionForm
                            action={deleteIpBlock.url(blockedIpAddress.id)}
                            method="delete"
                            destructive
                            confirmation={{
                                title: `Delete ${blockedIpAddress.ipAddress}?`,
                                description:
                                    'This removes the IP address record and its block history.',
                                confirmLabel: 'Delete',
                            }}
                        >
                            <Trash2 />
                            Delete
                        </DetailsActionForm>
                    </>
                ) : null
            }
        >
            <DetailsView
                record={blockedIpAddress}
                summary={
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-link/10 text-link">
                            <GlobeLock className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <code className="font-mono text-base font-semibold">
                                {blockedIpAddress.ipAddress}
                            </code>
                            <div className="mt-1">
                                <StatusBadge
                                    isActive={blockedIpAddress.isActive}
                                />
                            </div>
                        </div>
                    </div>
                }
                sections={[
                    {
                        key: 'rule',
                        title: 'Access rule',
                        description:
                            'The exact network address and the current access decision.',
                        columns: [
                            {
                                key: 'reason',
                                label: 'Reason',
                                cell: (record) =>
                                    record.reason ?? 'No reason provided.',
                                span: 'full',
                            },
                            {
                                key: 'user',
                                label: 'Observed user',
                                cell: (record) =>
                                    record.user ? (
                                        <div>
                                            <p className="font-medium">
                                                {record.user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {record.user.email}
                                            </p>
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <UserRound className="size-3.5" />
                                            No user recorded
                                        </span>
                                    ),
                            },
                            {
                                key: 'lastSeenAt',
                                label: 'Last seen',
                                cell: (record) => (
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <CalendarClock className="size-3.5" />
                                        {formatDate(
                                            record.lastSeenAt ??
                                                record.firstSeenAt,
                                        )}
                                    </span>
                                ),
                            },
                        ],
                    },
                    {
                        key: 'timeline',
                        title: 'Timeline',
                        description:
                            'When the address was observed and when its state changed.',
                        columns: [
                            {
                                key: 'firstSeenAt',
                                label: 'First seen',
                                cell: (record) =>
                                    formatDate(record.firstSeenAt),
                            },
                            {
                                key: 'blockedAt',
                                label: 'Blocked at',
                                cell: (record) => formatDate(record.blockedAt),
                            },
                            {
                                key: 'blockedBy',
                                label: 'Blocked by',
                                cell: (record) => (
                                    <Actor actor={record.blockedBy} />
                                ),
                            },
                            {
                                key: 'unblockedAt',
                                label: 'Unblocked at',
                                cell: (record) =>
                                    formatDate(record.unblockedAt),
                            },
                            {
                                key: 'unblockedBy',
                                label: 'Unblocked by',
                                cell: (record) => (
                                    <Actor actor={record.unblockedBy} />
                                ),
                            },
                        ],
                    },
                ]}
            />
        </DetailsPage>
    );
}

IpBlockShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'IP addresses', href: ipBlocksIndex() },
        { title: 'IP details', href: ipBlocksIndex() },
    ],
};
