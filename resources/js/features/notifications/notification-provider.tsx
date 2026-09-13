import { router, usePage } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import { summary as summaryRoute } from '@/routes/notifications';
import type { NotificationSummary } from './types';

const empty: NotificationSummary = { total: 0, unread: 0, items: [] };
const NotificationContext = createContext({
    summary: empty,
    loading: false,
    error: '',
    refresh: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { notifications = empty } = usePage().props;
    const [snapshot, setSnapshot] = useState({
        source: notifications,
        value: notifications,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const stopped = useRef(false);
    const pending = useRef<AbortController | null>(null);
    const summary =
        snapshot.source === notifications ? snapshot.value : notifications;
    const refresh = useCallback(async () => {
        if (
            stopped.current ||
            pending.current ||
            document.visibilityState === 'hidden'
        ) {
            return;
        }

        const controller = new AbortController();
        pending.current = controller;
        setLoading(true);

        try {
            const response = await fetch(summaryRoute().url, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
                signal: controller.signal,
            });

            if ([401, 403, 419].includes(response.status)) {
                stopped.current = true;

                throw new Error(
                    'Your session is no longer available. Refresh the page to sign in.',
                );
            }

            if (!response.ok || response.redirected) {
                throw new Error('Notifications could not refresh. Try again.');
            }

            const value: NotificationSummary = await response.json();

            if (!controller.signal.aborted) {
                setSnapshot({ source: notifications, value });
                setError('');

                if (window.location.pathname === '/notifications') {
                    router.reload({ only: ['inbox', 'notifications'] });
                }
            }
        } catch (failure) {
            if (!controller.signal.aborted) {
                setError(
                    failure instanceof Error
                        ? failure.message
                        : 'Notifications could not refresh. Try again.',
                );
            }
        } finally {
            if (pending.current === controller || pending.current === null) {
                pending.current = null;
                setLoading(false);
            }
        }
    }, [notifications]);

    useEffect(() => {
        const timer = window.setInterval(() => void refresh(), 60_000);
        const focus = () => void refresh();
        window.addEventListener('focus', focus);
        document.addEventListener('visibilitychange', focus);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener('focus', focus);
            document.removeEventListener('visibilitychange', focus);
            pending.current?.abort();
            pending.current = null;
        };
    }, [refresh]);

    return (
        <NotificationContext value={{ summary, loading, error, refresh }}>
            {children}
        </NotificationContext>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
