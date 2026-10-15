import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNotifications } from '@/features/notifications/notification-provider';
import type { BackupOperation } from '../types';

export function useBackupPolling(
    busy: boolean,
    operations: readonly BackupOperation[] = [],
    createdOperationId: string | null = null,
) {
    const [notice, setNotice] = useState<string | null>(null);
    const { refresh: refreshNotifications } = useNotifications();
    const previousStatuses = useRef(
        new Map<string, BackupOperation['status']>(),
    );
    const notifiedOperations = useRef(new Set<string>());
    const trackedOperationId = useRef<string | null>(null);

    useEffect(() => {
        if (createdOperationId) {
            trackedOperationId.current = createdOperationId;
        }

        for (const operation of operations) {
            const previousStatus = previousStatuses.current.get(operation.id);
            const finished =
                previousStatus !== undefined &&
                ['queued', 'running'].includes(previousStatus) &&
                ['succeeded', 'failed', 'interrupted'].includes(
                    operation.status,
                );
            const isTrackedCompletion =
                operation.id === trackedOperationId.current &&
                ['succeeded', 'failed', 'interrupted'].includes(
                    operation.status,
                );

            if (
                operation.type === 'backup' &&
                (finished || isTrackedCompletion) &&
                !notifiedOperations.current.has(operation.id)
            ) {
                notifiedOperations.current.add(operation.id);

                if (operation.status === 'succeeded') {
                    toast.success('Database backup ready', {
                        description:
                            'Your backup is available in Backup & Restore.',
                    });
                } else {
                    toast.error('Database backup failed', {
                        description:
                            'Review the operation status in Backup & Restore.',
                    });
                }

                void refreshNotifications();
            }

            previousStatuses.current.set(operation.id, operation.status);
        }
    }, [createdOperationId, operations, refreshNotifications]);

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
