import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Link } from '@inertiajs/react';
import { Bell, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { index } from '@/routes/notifications';
import { useNotifications } from '../notification-provider';
import { MarkAllRead, NotificationList } from './notification-list';

export function NotificationRefreshStatus() {
    const { loading, error, refresh } = useNotifications();

    return (
        <>
            {loading && (
                <p
                    role="status"
                    className="px-4 py-2 text-sm text-muted-foreground"
                >
                    Refreshing notifications…
                </p>
            )}
            {error && (
                <div
                    role="alert"
                    className="px-4 py-2 text-sm text-destructive"
                >
                    {error}{' '}
                    <Button variant="outline" size="sm" onClick={refresh}>
                        Retry
                    </Button>
                </div>
            )}
        </>
    );
}

export function NotificationBell({ className }: { className?: string }) {
    const { summary, refresh } = useNotifications();
    const [open, setOpen] = useState(false);
    const [top, setTop] = useState(64);
    const [right, setRight] = useState(16);
    const trigger = useRef<HTMLButtonElement>(null);
    const mobile = useIsMobile();
    const content = (
        <>
            <div className="border-b border-border p-4 pr-12">
                <DialogTitle>Notifications</DialogTitle>
                <DialogDescription className="mt-1">
                    {summary.unread} unread · {summary.total} total
                </DialogDescription>
            </div>
            <div className="flex justify-end px-2 py-1">
                <MarkAllRead />
            </div>
            <NotificationRefreshStatus />
            <NotificationList
                items={summary.items}
                onOpen={() => setOpen(false)}
            />
            <div className="border-t border-border p-3">
                <Button asChild variant="outline" className="w-full">
                    <Link href={index()} onClick={() => setOpen(false)}>
                        View all notifications
                    </Link>
                </Button>
            </div>
        </>
    );

    return (
        <Dialog
            modal={mobile}
            open={open}
            onOpenChange={(value) => {
                setOpen(value);

                if (value) {
                    setTop(
                        (trigger.current?.getBoundingClientRect().bottom ??
                            56) + 8,
                    );
                    setRight(
                        Math.max(
                            16,
                            Math.min(
                                window.innerWidth - 400,
                                window.innerWidth -
                                    (trigger.current?.getBoundingClientRect()
                                        .right ?? window.innerWidth),
                            ),
                        ),
                    );
                    refresh();
                }
            }}
        >
            <DialogTrigger asChild>
                <Button
                    ref={trigger}
                    variant="ghost"
                    size="icon"
                    className={`relative shrink-0 ${className ?? ''}`}
                    aria-label={`Notifications, ${summary.unread} unread`}
                >
                    <Bell className="size-5" />
                    {summary.unread > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute -top-1 -right-1 min-w-5 rounded-full bg-primary px-1 text-[10px] leading-5 font-semibold text-primary-foreground tabular-nums"
                        >
                            {summary.unread > 99 ? '99+' : summary.unread}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            {mobile ? (
                <DialogContent className="max-h-[85dvh] gap-0 overflow-y-auto p-0">
                    {content}
                </DialogContent>
            ) : (
                <DialogPortal>
                    <DialogPrimitive.Content
                        style={{ top, right }}
                        className="fixed z-50 max-h-[calc(100dvh-6rem)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
                    >
                        {content}
                        <DialogPrimitive.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Close notifications"
                                className="absolute top-2 right-2"
                            >
                                <X className="size-4" />
                            </Button>
                        </DialogPrimitive.Close>
                    </DialogPrimitive.Content>
                </DialogPortal>
            )}
        </Dialog>
    );
}
