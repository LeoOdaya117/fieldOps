import { CalendarClock, Globe2, UserRound } from 'lucide-react';
import {
    DetailField,
    DetailsPage,
    DetailsSection,
} from '@/components/details-page';
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
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
                <DetailsSection
                    title="Event context"
                    description="Who made the change, what it affected, and when it occurred."
                >
                    <div className="space-y-6 p-4 sm:p-6">
                        <Badge
                            variant="secondary"
                            className="font-mono text-[11px]"
                        >
                            {event.event}
                        </Badge>
                        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                            <DetailField label="Actor">
                                {event.actor ? (
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                                                {initials(event.actor.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">
                                                {event.actor.name}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {event.actor.email}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <UserRound className="size-3.5" />
                                        System
                                    </span>
                                )}
                            </DetailField>
                            <DetailField label="Occurred">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <CalendarClock className="size-3.5" />
                                    {new Date(
                                        event.occurredAt,
                                    ).toLocaleString()}
                                </span>
                            </DetailField>
                            <DetailField label="Subject">
                                {event.subjectType ? (
                                    <code className="font-mono text-xs break-all">
                                        {event.subjectType} #{event.subjectId}
                                    </code>
                                ) : (
                                    'Not recorded'
                                )}
                            </DetailField>
                            <DetailField label="Source IP">
                                <span className="flex items-center gap-2">
                                    <Globe2 className="size-3.5 text-muted-foreground" />
                                    <code className="font-mono text-xs">
                                        {event.ipAddress ?? 'Not recorded'}
                                    </code>
                                </span>
                            </DetailField>
                        </dl>
                    </div>
                </DetailsSection>

                <DetailsSection
                    title="Client context"
                    description="The safe request metadata retained with the audit record."
                >
                    <dl className="grid gap-5 p-4 sm:p-6">
                        <DetailField label="User agent">
                            <span className="break-words text-muted-foreground">
                                {event.userAgent ?? 'Not recorded'}
                            </span>
                        </DetailField>
                        <DetailField label="Event identifier">
                            #{event.id}
                        </DetailField>
                    </dl>
                </DetailsSection>
            </div>

            <DetailsSection
                title="Recorded changes"
                description="The before and after values captured for this event."
            >
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
                    <ChangeBlock label="Before" value={event.before} />
                    <ChangeBlock label="After" value={event.after} />
                </div>
            </DetailsSection>
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
