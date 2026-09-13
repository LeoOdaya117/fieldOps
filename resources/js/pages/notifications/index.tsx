import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/notifications';
import {
    MarkAllRead,
    NotificationList,
} from '@/features/notifications/components/notification-list';
import { NotificationRefreshStatus } from '@/features/notifications/components/notification-bell';
import { useNotifications } from '@/features/notifications/notification-provider';
import type { NotificationInbox } from '@/features/notifications/types';

function InboxContent({
    inbox,
    filter,
}: {
    inbox: NotificationInbox;
    filter: string;
}) {
    const { summary } = useNotifications();

    return (
        <div className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        Notifications
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {summary.total} total · {summary.unread} unread. Keep up
                        with updates that need your attention.
                    </p>
                </div>
                <MarkAllRead />
            </div>
            <nav aria-label="Filter notifications" className="flex gap-2">
                {['all', 'unread', 'read'].map((value) => (
                    <Button
                        key={value}
                        asChild
                        variant={filter === value ? 'secondary' : 'ghost'}
                    >
                        <Link
                            href={index({ query: { filter: value } })}
                            aria-current={filter === value ? 'page' : undefined}
                        >
                            {value[0].toUpperCase() + value.slice(1)}
                        </Link>
                    </Button>
                ))}
            </nav>
            <section
                aria-label="Inbox"
                className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
            >
                <NotificationRefreshStatus />
                <NotificationList items={inbox.data} />
            </section>
            <nav
                aria-label="Notification pages"
                className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
                <span className="text-muted-foreground">
                    Page {inbox.current_page} of {inbox.last_page} ·{' '}
                    {inbox.total} results
                </span>
                <div className="flex gap-2">
                    {inbox.prev_page_url && (
                        <Button variant="outline" asChild>
                            <Link href={inbox.prev_page_url}>Previous</Link>
                        </Button>
                    )}
                    {inbox.next_page_url && (
                        <Button variant="outline" asChild>
                            <Link href={inbox.next_page_url}>Next</Link>
                        </Button>
                    )}
                </div>
            </nav>
        </div>
    );
}

export default function NotificationsPage(props: {
    inbox: NotificationInbox;
    filter: string;
}) {
    return (
        <>
            <Head title="Notifications" />
            <InboxContent {...props} />
        </>
    );
}

NotificationsPage.layout = {
    breadcrumbs: [{ title: 'Notifications', href: index().url }],
};
