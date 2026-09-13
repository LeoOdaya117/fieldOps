import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    NotificationItem,
    NotificationSummary,
} from '@/features/notifications/types';

const mocks = vi.hoisted(() => ({
    page: {
        props: {
            notifications: {
                total: 0,
                unread: 0,
                items: [],
            } as NotificationSummary,
            system: { timezone: 'Asia/Manila' },
        },
    },
    patch: vi.fn(),
    transform: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
    mobile: false,
}));
vi.mock('@inertiajs/react', () => ({
    usePage: () => mocks.page,
    useForm: () => ({
        patch: mocks.patch,
        transform: mocks.transform,
        processing: false,
        errors: {},
    }),
    router: { visit: mocks.visit, reload: mocks.reload },
    Head: () => null,
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children: ReactNode;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
}));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => mocks.mobile }));

import { NotificationProvider } from '@/features/notifications/notification-provider';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { NotificationRow } from '@/features/notifications/components/notification-list';
import NotificationsPage from '@/pages/notifications/index';

const item: NotificationItem = {
    id: 'a1',
    type: 'registration.submitted',
    title: 'Registration awaiting review',
    body: 'An applicant submitted a registration.',
    createdAt: '2026-09-13T00:00:00Z',
    readAt: null,
    actionUrl: '/access/users/registrations/1',
};
const fetched = vi.fn();
function bell() {
    return render(
        <NotificationProvider>
            <NotificationBell />
        </NotificationProvider>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    mocks.mobile = false;
    mocks.page.props.notifications = { total: 1, unread: 1, items: [item] };
    fetched.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mocks.page.props.notifications,
    });
    vi.stubGlobal('fetch', fetched);
    Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
    });
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('notifications', () => {
    it.each([0, 1, 99, 100])(
        'announces the exact %i count and bounds its badge',
        (count) => {
            mocks.page.props.notifications = {
                total: count,
                unread: count,
                items: [],
            };
            bell();
            const trigger = screen.getByRole('button', {
                name: `Notifications, ${count} unread`,
            });
            expect(trigger.textContent).toBe(
                count ? (count > 99 ? '99+' : String(count)) : '',
            );
        },
    );

    it.each([false, true])(
        'opens an accessible preview without marking read (mobile=%s)',
        async (mobile) => {
            mocks.mobile = mobile;
            bell();
            const trigger = screen.getByRole('button', {
                name: 'Notifications, 1 unread',
            });
            fireEvent.click(trigger);
            expect(await screen.findByRole('dialog')).toBeVisible();
            expect(screen.getByText(item.title)).toBeVisible();
            expect(screen.getByText('Unread', { exact: true })).toBeVisible();
            expect(
                screen.getByRole('link', { name: 'View all notifications' }),
            ).toHaveAttribute('href', '/notifications');
            await waitFor(() => expect(fetched).toHaveBeenCalledTimes(1));
            expect(mocks.patch).not.toHaveBeenCalled();
            fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
            await waitFor(() =>
                expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
            );
            await waitFor(() => expect(trigger).toHaveFocus());
        },
    );

    it('polls only while visible and stops after expiry', async () => {
        vi.useFakeTimers();
        bell();
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60_000);
        });
        expect(fetched).toHaveBeenCalledTimes(1);
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'hidden',
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60_000);
        });
        expect(fetched).toHaveBeenCalledTimes(1);
        fetched.mockResolvedValue({ status: 401, ok: false });
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        await act(async () => {
            fireEvent(document, new Event('visibilitychange'));
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(120_000);
        });
        expect(fetched).toHaveBeenCalledTimes(2);
    });

    it('preserves the preview on failure and retries', async () => {
        fetched.mockRejectedValueOnce(new Error('Connection interrupted'));
        bell();
        fireEvent.click(
            screen.getByRole('button', { name: 'Notifications, 1 unread' }),
        );
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Connection interrupted',
        );
        expect(screen.getByText(item.title)).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        await waitFor(() =>
            expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
        );
    });

    it('marks read before navigating and supports unread and failure states', async () => {
        const { rerender } = render(
            <ul>
                <NotificationRow item={item} />
            </ul>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'View details' }));
        expect(mocks.transform.mock.calls[0][0]()).toEqual({ read: true });
        expect(mocks.visit).not.toHaveBeenCalled();
        act(() => mocks.patch.mock.calls[0][1].onSuccess());
        expect(mocks.visit).toHaveBeenCalledWith(item.actionUrl);
        rerender(
            <ul>
                <NotificationRow item={{ ...item, readAt: item.createdAt }} />
            </ul>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Mark as unread' }));
        expect(mocks.transform.mock.lastCall?.[0]()).toEqual({ read: false });
        act(() => mocks.patch.mock.lastCall?.[1].onNetworkError());
        expect(screen.getByRole('alert')).toHaveTextContent('Could not update');
    });

    it('renders filters, pagination, counts, and an empty inbox', () => {
        mocks.page.props.notifications = { total: 25, unread: 3, items: [] };
        render(
            <NotificationProvider>
                <NotificationsPage
                    filter="unread"
                    inbox={{
                        data: [],
                        total: 3,
                        current_page: 1,
                        last_page: 2,
                        prev_page_url: null,
                        next_page_url: '/notifications?filter=unread&page=2',
                    }}
                />
            </NotificationProvider>,
        );
        expect(
            screen.getByRole('heading', { name: 'Notifications' }),
        ).toBeVisible();
        expect(screen.getByText(/25 total · 3 unread/)).toBeVisible();
        expect(screen.getByRole('link', { name: 'Unread' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
            'href',
            '/notifications?filter=unread&page=2',
        );
        expect(screen.getByText('No notifications here')).toBeVisible();
        fireEvent.click(
            screen.getByRole('button', { name: 'Mark all as read' }),
        );
        expect(mocks.patch).toHaveBeenCalledWith(
            '/notifications/read-all',
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('updates counts from polling and from subsequent Inertia props', async () => {
        const rendered = bell();
        fetched.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ total: 2, unread: 2, items: [item] }),
        });
        await act(async () => {
            fireEvent(window, new Event('focus'));
        });
        expect(
            screen.getByRole('button', { name: 'Notifications, 2 unread' }),
        ).toBeVisible();
        mocks.page.props.notifications = { total: 2, unread: 0, items: [] };
        rendered.rerender(
            <NotificationProvider>
                <NotificationBell />
            </NotificationProvider>,
        );
        expect(
            screen.getByRole('button', { name: 'Notifications, 0 unread' }),
        ).toBeVisible();
    });

    it('cancels an old refresh when Inertia replaces the summary', async () => {
        let release: (value: unknown) => void = () => {};
        fetched.mockReturnValue(
            new Promise((resolve) => {
                release = resolve;
            }),
        );
        const rendered = bell();
        fireEvent.click(
            screen.getByRole('button', { name: 'Notifications, 1 unread' }),
        );
        fireEvent(window, new Event('focus'));
        expect(fetched).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('status')).toBeVisible();
        mocks.page.props.notifications = { total: 1, unread: 0, items: [] };
        rendered.rerender(
            <NotificationProvider>
                <NotificationBell />
            </NotificationProvider>,
        );
        await act(async () => {
            release({
                ok: true,
                status: 200,
                json: async () => ({ total: 1, unread: 1, items: [item] }),
            });
        });
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Notifications, 0 unread' }),
        ).toBeVisible();
    });
});
