import { CalendarClock, Globe2, UserRound } from 'lucide-react';
import { DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { AuditEvent } from '@/features/access/audit-table-model';
import { dashboard } from '@/routes';
import { index as auditIndex } from '@/routes/access/audit';

function initials(name: string): string {
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function ChangeBlock({
    label,
    value,
}: {
    label: string;
    value: Record<string, unknown> | null;
}) {
    return (
        <div className="min-w-0 rounded-lg border border-border/80 bg-muted/15 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {label}
            </p>
            <pre className="max-h-96 overflow-auto rounded-md bg-muted/60 p-3 text-xs leading-relaxed text-foreground">
                {JSON.stringify(value ?? {}, null, 2)}
            </pre>
        </div>
    );
}

export default function AuditShowPage({ event }: { event: AuditEvent }) {
    return (
        <DetailsPage
            title="Audit event details"
            description="Review the immutable record of this access or security change."
            backHref={auditIndex.url()}
            backLabel="Back to audit"
        >
            <DetailsView
                record={event}
                summary={
                    <Badge
                        variant="secondary"
                        className="font-mono text-[11px]"
                    >
                        {event.event}
                    </Badge>
                }
                sections={[
                    {
                        key: 'event-context',
                        title: 'Event context',
                        description:
                            'Who made the change, what it affected, and when it occurred.',
                        columns: [
                            {
                                key: 'actor',
                                label: 'Actor',
                                cell: (record) =>
                                    record.actor ? (
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-8 rounded-lg">
                                                <AvatarFallback className="rounded-lg bg-link/10 text-[11px] font-semibold text-link">
                                                    {initials(
                                                        record.actor.name,
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {record.actor.name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {record.actor.email}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <UserRound className="size-3.5" />
                                            System
                                        </span>
                                    ),
                            },
                            {
                                key: 'occurredAt',
                                label: 'Occurred',
                                cell: (record) => (
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <CalendarClock className="size-3.5" />
                                        {new Date(
                                            record.occurredAt,
                                        ).toLocaleString()}
                                    </span>
                                ),
                            },
                            {
                                key: 'subject',
                                label: 'Subject',
                                cell: (record) =>
                                    record.subjectType ? (
                                        <code className="font-mono text-xs break-all">
                                            {record.subjectType} #
                                            {record.subjectId}
                                        </code>
                                    ) : (
                                        'Not recorded'
                                    ),
                            },
                            {
                                key: 'ipAddress',
                                label: 'Source IP',
                                cell: (record) => (
                                    <span className="flex items-center gap-2">
                                        <Globe2 className="size-3.5 text-muted-foreground" />
                                        <code className="font-mono text-xs">
                                            {record.ipAddress ?? 'Not recorded'}
                                        </code>
                                    </span>
                                ),
                            },
                        ],
                    },
                    {
                        key: 'client-context',
                        title: 'Client context',
                        description:
                            'The safe request metadata retained with the audit record.',
                        columns: [
                            {
                                key: 'userAgent',
                                label: 'User agent',
                                span: 'full',
                                valueClassName:
                                    'break-words text-muted-foreground',
                                cell: (record) =>
                                    record.userAgent ?? 'Not recorded',
                            },
                            {
                                key: 'id',
                                label: 'Event identifier',
                                cell: (record) => `#${record.id}`,
                            },
                        ],
                    },
                    {
                        key: 'recorded-changes',
                        title: 'Recorded changes',
                        description:
                            'The before and after values captured for this event.',
                        content: (record) => (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <ChangeBlock
                                    label="Before"
                                    value={record.before}
                                />
                                <ChangeBlock
                                    label="After"
                                    value={record.after}
                                />
                            </div>
                        ),
                    },
                ]}
            />
        </DetailsPage>
    );
}

AuditShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Access audit', href: auditIndex() },
        { title: 'Event details', href: auditIndex() },
    ],
};
