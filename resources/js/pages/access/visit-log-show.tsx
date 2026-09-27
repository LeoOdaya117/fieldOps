import { CalendarClock, Globe2, MapPin, UserRound } from 'lucide-react';
import { DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { visitLogEventBadgeClassName } from '@/features/access/visit-log-table-model';
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

function locationLabel(log: VisitLog): string {
    const place = [
        log.locationCity,
        log.locationRegion,
        log.locationCountryCode,
    ]
        .filter(Boolean)
        .join(', ');

    if (place !== '') {
        return place;
    }

    if (log.locationLatitude !== null && log.locationLongitude !== null) {
        return `${log.locationLatitude.toFixed(5)}, ${log.locationLongitude.toFixed(5)}`;
    }

    return '';
}

export default function VisitLogShowPage({ log }: { log: VisitLog }) {
    return (
        <DetailsPage
            title="Visit log details"
            description="Inspect the request context captured when a user logged in or logged out."
            backHref={visitLogsIndex.url()}
            backLabel="Back to visit logs"
        >
            <DetailsView
                record={log}
                summary={
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge
                            variant="outline"
                            className={visitLogEventBadgeClassName(
                                log.eventType,
                            )}
                        >
                            {label(log.eventType)}
                        </Badge>
                        <Badge variant="outline">{label(log.outcome)}</Badge>
                    </div>
                }
                sections={[
                    {
                        key: 'activity',
                        title: 'Activity',
                        description:
                            'The event and account context associated with the request.',
                        columns: [
                            {
                                key: 'ipAddress',
                                label: 'IP address',
                                cell: (record) => (
                                    <span className="flex items-center gap-2">
                                        <Globe2 className="size-3.5 text-muted-foreground" />
                                        <code className="font-mono text-xs">
                                            {record.ipAddress}
                                        </code>
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
                                key: 'location',
                                label: 'Browser location',
                                cell: (record) => (
                                    <span className="flex items-start gap-2">
                                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                        <span>
                                            {locationLabel(record) ||
                                                'Not available'}
                                            {record.locationSource ===
                                            'browser' ? (
                                                <span className="mt-1 block text-xs text-muted-foreground">
                                                    Provided by the browser with
                                                    user permission.
                                                </span>
                                            ) : null}
                                        </span>
                                    </span>
                                ),
                            },
                            {
                                key: 'user',
                                label: 'User',
                                span: 'full',
                                cell: (record) =>
                                    record.user ? (
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-8 rounded-lg">
                                                <AvatarFallback className="rounded-lg bg-link/10 text-[11px] font-semibold text-link">
                                                    {initials(record.user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">
                                                    {record.user.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {record.user.email}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-2 text-muted-foreground">
                                            <UserRound className="size-3.5" />
                                            Anonymous
                                        </span>
                                    ),
                            },
                        ],
                    },
                    {
                        key: 'request',
                        title: 'Request',
                        description:
                            'Safe request metadata without bodies, tokens, or query strings.',
                        columns: [
                            {
                                key: 'method',
                                label: 'Method',
                                cell: (record) => (
                                    <Badge
                                        variant="outline"
                                        className="font-mono text-[10px]"
                                    >
                                        {record.method}
                                    </Badge>
                                ),
                            },
                            {
                                key: 'path',
                                label: 'Path',
                                cell: (record) => (
                                    <code className="font-mono text-xs break-all">
                                        {record.path}
                                    </code>
                                ),
                            },
                            {
                                key: 'routeName',
                                label: 'Route name',
                                cell: (record) => (
                                    <code className="font-mono text-xs break-all text-muted-foreground">
                                        {record.routeName ?? 'Not recorded'}
                                    </code>
                                ),
                            },
                            {
                                key: 'coordinates',
                                label: 'Coordinates',
                                cell: (record) =>
                                    record.locationLatitude !== null &&
                                    record.locationLongitude !== null ? (
                                        <code className="font-mono text-xs">
                                            {record.locationLatitude},{' '}
                                            {record.locationLongitude}
                                        </code>
                                    ) : (
                                        'Not recorded'
                                    ),
                            },
                            {
                                key: 'accuracy',
                                label: 'Accuracy',
                                cell: (record) =>
                                    record.locationAccuracyMeters !== null
                                        ? `±${Math.round(record.locationAccuracyMeters)} m`
                                        : 'Not recorded',
                            },
                            {
                                key: 'timezone',
                                label: 'Timezone',
                                cell: (record) =>
                                    record.locationTimezone ?? 'Not recorded',
                            },
                            {
                                key: 'statusCode',
                                label: 'Response status',
                                cell: (record) =>
                                    record.statusCode ?? 'Not recorded',
                            },
                            {
                                key: 'userAgent',
                                label: 'User agent',
                                span: 'full',
                                valueClassName:
                                    'break-words text-muted-foreground',
                                cell: (record) =>
                                    record.userAgent ?? 'Not recorded',
                            },
                        ],
                    },
                ]}
            />
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
