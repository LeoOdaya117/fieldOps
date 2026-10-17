import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

const ACTIVITY_KEY_PREFIX = 'fieldops:last-activity:';
const CHANNEL_NAME_PREFIX = 'fieldops:session-activity:';
const LEGACY_ACTIVITY_KEY = 'fieldops:last-activity';
const HEARTBEAT_INTERVAL_MS = 60_000;

function csrfToken(): string {
    const token = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length);

    return token ? decodeURIComponent(token) : '';
}

async function postActivity(): Promise<boolean> {
    const response = await fetch('/session/activity', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken(),
        },
    });

    return response.ok;
}

export function useIdleSession(
    enabled: boolean,
    timeoutSeconds: number,
    sessionScope: string | null,
) {
    const lastActivityRef = useRef(0);
    const lastHeartbeatRef = useRef(0);
    const loggingOutRef = useRef(false);

    useEffect(() => {
        if (!enabled || !sessionScope || timeoutSeconds < 1) {
            return;
        }

        lastHeartbeatRef.current = 0;
        loggingOutRef.current = false;

        const activityKey = `${ACTIVITY_KEY_PREFIX}${sessionScope}`;
        const channelName = `${CHANNEL_NAME_PREFIX}${sessionScope}`;
        const stored = Number(window.localStorage.getItem(activityKey));
        lastActivityRef.current =
            Number.isFinite(stored) && stored > 0 ? stored : Date.now();

        // This value predates session scoping and must never seed a new session.
        window.localStorage.removeItem(LEGACY_ACTIVITY_KEY);

        const channel =
            'BroadcastChannel' in window
                ? new BroadcastChannel(channelName)
                : null;

        const broadcast = (timestamp: number) => {
            window.localStorage.setItem(activityKey, String(timestamp));
            channel?.postMessage({ type: 'activity', timestamp });
        };

        const logout = () => {
            if (loggingOutRef.current) {
                return;
            }

            loggingOutRef.current = true;
            channel?.postMessage({ type: 'logout' });
            router.post('/logout', {}, { preserveState: false });
        };

        const heartbeat = async (timestamp: number) => {
            if (timestamp - lastHeartbeatRef.current < HEARTBEAT_INTERVAL_MS) {
                return;
            }

            lastHeartbeatRef.current = timestamp;

            try {
                if (!(await postActivity())) {
                    logout();
                }
            } catch {
                // A transient network failure must not turn user activity into a logout.
            }
        };

        let lastRecordedAt = 0;
        const recordActivity = () => {
            const timestamp = Date.now();

            if (timestamp - lastRecordedAt < 750) {
                return;
            }

            lastRecordedAt = timestamp;
            lastActivityRef.current = timestamp;
            broadcast(timestamp);
            void heartbeat(timestamp);
        };

        const receiveActivity = (timestamp: number) => {
            if (Number.isFinite(timestamp)) {
                lastActivityRef.current = Math.max(
                    lastActivityRef.current,
                    timestamp,
                );
            }
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === activityKey && event.newValue !== null) {
                receiveActivity(Number(event.newValue));
            }
        };

        const onChannelMessage = (event: MessageEvent) => {
            if (event.data?.type === 'logout') {
                window.location.assign('/login');
            } else if (event.data?.type === 'activity') {
                receiveActivity(Number(event.data.timestamp));
            }
        };

        const check = () => {
            if (Date.now() - lastActivityRef.current >= timeoutSeconds * 1000) {
                logout();
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                check();
            }
        };

        const events: Array<keyof WindowEventMap> = [
            'pointerdown',
            'pointermove',
            'keydown',
            'touchstart',
            'scroll',
        ];

        events.forEach((event) =>
            window.addEventListener(event, recordActivity, { passive: true }),
        );
        window.addEventListener('storage', onStorage);
        document.addEventListener('visibilitychange', onVisibilityChange);
        channel?.addEventListener('message', onChannelMessage);

        const interval = window.setInterval(check, 1000);

        return () => {
            events.forEach((event) =>
                window.removeEventListener(event, recordActivity),
            );
            window.removeEventListener('storage', onStorage);
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
            channel?.removeEventListener('message', onChannelMessage);
            channel?.close();
            window.clearInterval(interval);
        };
    }, [enabled, timeoutSeconds, sessionScope]);
}
