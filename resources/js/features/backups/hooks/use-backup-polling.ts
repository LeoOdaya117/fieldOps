import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export function useBackupPolling(busy: boolean) {
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!busy) {
            return;
        }

        let stopped = false;
        let pending = false;
        let cancelVisit: (() => void) | undefined;
        const timer = window.setInterval(() => {
            if (stopped || pending) {
                return;
            }

            pending = true;
            router.reload({
                showProgress: false,
                only: [
                    'backups',
                    'backup',
                    'events',
                    'operations',
                    'prerequisites',
                    'busy',
                ],
                onCancelToken: (token) => {
                    cancelVisit = () => token.cancel();
                },
                onHttpException: (response) => {
                    if (stopped) {
                        return false;
                    }

                    stopped = true;
                    setNotice(
                        response.status === 503
                            ? 'The application is in maintenance mode for database recovery. When your server operator confirms recovery is complete, sign in again.'
                            : 'Operation updates are unavailable. Refresh this page to check the latest status.',
                    );

                    return false;
                },
                onNetworkError: () => {
                    if (stopped) {
                        return false;
                    }

                    stopped = true;
                    setNotice(
                        'Connection lost. Refresh this page to check the latest operation status before starting another operation.',
                    );

                    return false;
                },
                onFinish: () => {
                    pending = false;
                },
            });
        }, 4000);

        return () => {
            stopped = true;
            window.clearInterval(timer);
            cancelVisit?.();
        };
    }, [busy]);

    return notice;
}
