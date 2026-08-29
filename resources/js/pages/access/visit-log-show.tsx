import { CalendarClock, Globe2, UserRound } from 'lucide-react';
import {
    DetailField,
    DetailsPage,
    DetailsSection,
} from '@/components/details-page';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { VisitLog } from '@/features/access/visit-log-table-model';
import { dashboard } from '@/routes';
import { index as visitLogsIndex } from '@/routes/access/visit-logs';

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
        : 'Not recorded';
}

export default function VisitLogShowPage({ log }: { log: VisitLog }) {
    return (
        <DetailsPage
            title="Visit log details"
            description="Inspect the request context captured for this security activity event."
            backHref={visitLogsIndex.url()}
            backLabel="Back to visit logs"
        >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
                <DetailsSection
                    title="Activity"
                    description="The event and account context associated with the request."
                >
                    <div className="space-y-6 p-4 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                                {label(log.eventType)}
                            </Badge>
                            <Badge variant="outline">
                                {label(log.outcome)}
                            </Badge>
                        </div>
                        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                            <DetailField label="IP address">
                                <span className="flex items-center gap-2">
                                    <Globe2 className="size-3.5 text-muted-foreground" />
                                    <code className="font-mono text-xs">
                                        {log.ipAddress}
                                    </code>
                                </span>
                            </DetailField>
                            <DetailField label="Occurred">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <CalendarClock className="size-3.5" />
                                    {new Date(log.occurredAt).toLocaleString()}
                                </span>
                            </DetailField>
                            <DetailField label="User" className="sm:col-span-2">
                                {log.user ? (
                                    <div className="flex items-center gap-3">
                                        <Avatar className="size-8 rounded-lg">
                                            <AvatarFallback className="rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                                                {initials(log.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">
                                                {log.user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {log.user.email}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <UserRound className="size-3.5" />
                                        Anonymous
                                    </span>
                                )}
                            </DetailField>
                        </dl>
                    </div>
                </DetailsSection>

                <DetailsSection
                    title="Request"
                    description="Safe request metadata without bodies, tokens, or query strings."
                >
                    <dl className="grid gap-5 p-4 sm:p-6">
                        <DetailField label="Method">
                            <Badge
                                variant="outline"
                                className="font-mono text-[10px]"
                            >
                                {log.method}
                            </Badge>
                        </DetailField>
                        <DetailField label="Path">
                            <code className="font-mono text-xs break-all">
                                {log.path}
                            </code>
                        </DetailField>
                        <DetailField label="Route name">
                            <code className="font-mono text-xs break-all text-muted-foreground">
                                {log.routeName ?? 'Not recorded'}
                            </code>
                        </DetailField>
                        <DetailField label="Response status">
                            {log.statusCode ?? 'Not recorded'}
                        </DetailField>
                        <DetailField label="User agent">
                            <span className="break-words text-muted-foreground">
                                {log.userAgent ?? 'Not recorded'}
                            </span>
                        </DetailField>
                    </dl>
                </DetailsSection>
            </div>
        </DetailsPage>
    );
}

VisitLogShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Visit logs', href: visitLogsIndex() },
        { title: 'Log details', href: visitLogsIndex() },
    ],
};
