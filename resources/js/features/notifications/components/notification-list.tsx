import { useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { startBrowserDownload } from '@/features/exports/lib/browser-download';
import { readAll, update } from '@/routes/notifications';
import { useNotifications } from '../notification-provider';
import type { NotificationItem } from '../types';

export function MarkAllRead() {
    const { summary } = useNotifications();
    const form = useForm({});
    const [failed, setFailed] = useState(false);

    return (
        <div>
            <Button
                variant="ghost"
                size="sm"
                disabled={!summary.unread || form.processing}
                onClick={() =>
                    form.patch(readAll().url, {
                        preserveScroll: true,
                        onStart: () => setFailed(false),
                        onNetworkError: () => {
                            setFailed(true);

                            return false;
                        },
                        onHttpException: () => {
                            setFailed(true);

                            return false;
                        },
                    })
                }
            >
                Mark all as read
            </Button>
            {(failed || Object.keys(form.errors).length > 0) && (
                <p role="alert" className="text-sm text-destructive">
                    Could not update notifications. Try again.
                </p>
            )}
        </div>
    );
}

export function NotificationRow({
    item,
    onOpen,
}: {
    item: NotificationItem;
    onOpen?: () => void;
}) {
    const form = useForm({ read: true });
    const [failed, setFailed] = useState(false);
    const { system } = usePage().props;
    const change = (read: boolean, navigate = false) => {
        form.transform(() => ({ read }));
        form.patch(update(item.id).url, {
            preserveScroll: true,
            onStart: () => setFailed(false),
            onNetworkError: () => {
                setFailed(true);

                return false;
            },
            onHttpException: () => {
                setFailed(true);

                return false;
            },
            onSuccess: () => {
                if (navigate && item.actionUrl) {
                    onOpen?.();

                    if (item.type === 'export.ready') {
                        startBrowserDownload(item.actionUrl);
                    } else {
                        router.visit(item.actionUrl);
                    }
                }
            },
        });
    };

    return (
        <li
            className={`space-y-2 border-b border-border p-4 last:border-b-0 ${item.readAt ? '' : 'bg-accent/40'}`}
        >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {!item.readAt && (
                    <span className="font-semibold text-foreground">
                        Unread
                    </span>
                )}
                {item.createdAt && (
                    <time dateTime={item.createdAt}>
                        {new Intl.DateTimeFormat(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                            timeZone: system.timezone,
                        }).format(new Date(item.createdAt))}
                    </time>
                )}
            </div>
            <p className="font-semibold break-words">{item.title}</p>
            <p className="max-w-prose text-sm break-words text-muted-foreground">
                {item.body}
            </p>
            <div className="flex flex-wrap gap-2">
                {item.actionUrl && (
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={form.processing}
                        onClick={() => change(true, true)}
                    >
                        {item.type === 'export.ready'
                            ? 'Open export'
                            : item.type === 'backup.ready'
                              ? 'View backup'
                              : 'View details'}
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={form.processing}
                    onClick={() => change(!item.readAt)}
                >
                    {item.readAt ? 'Mark as unread' : 'Mark as read'}
                </Button>
            </div>
            {(failed || Object.keys(form.errors).length > 0) && (
                <p role="alert" className="text-sm text-destructive">
                    Could not update this notification. Try again.
                </p>
            )}
        </li>
    );
}

export function NotificationList({
    items,
    onOpen,
    emptyTitle = 'No notifications here',
    emptyMessage = 'New updates will appear here when there is something to review.',
}: {
    items: NotificationItem[];
    onOpen?: () => void;
    emptyTitle?: string;
    emptyMessage?: string;
}) {
    if (!items.length) {
        return (
            <div className="px-4 py-12 text-center">
                <p className="font-medium">{emptyTitle}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                    {emptyMessage}
                </p>
            </div>
        );
    }

    return (
        <ul aria-label="Notification list">
            {items.map((item) => (
                <NotificationRow key={item.id} item={item} onOpen={onOpen} />
            ))}
        </ul>
    );
}

export function NotificationListSkeleton() {
    return (
        <div
            role="status"
            aria-label="Loading notifications"
            className="divide-y divide-border"
        >
            {[0, 1, 2].map((row) => (
                <div
                    key={row}
                    aria-hidden="true"
                    className="space-y-2 border-b border-border p-4 last:border-b-0"
                >
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full max-w-64" />
                    <Skeleton className="h-8 w-24" />
                </div>
            ))}
        </div>
    );
}
