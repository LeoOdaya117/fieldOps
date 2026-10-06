import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BackupOperation } from '@/features/backups/types';

const mocks = vi.hoisted(() => ({
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    refreshNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
    toast: {
        success: mocks.toastSuccess,
        error: mocks.toastError,
    },
}));

vi.mock('@/features/notifications/notification-provider', () => ({
    useNotifications: () => ({ refresh: mocks.refreshNotifications }),
}));

import { useBackupPolling } from '@/features/backups/hooks/use-backup-polling';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

function BackupPollingHarness({
    operations,
    createdOperationId,
}: {
    operations: BackupOperation[];
    createdOperationId?: string | null;
}) {
    useBackupPolling(false, operations, createdOperationId ?? null);

    return null;
}

function operation(
    status: BackupOperation['status'],
    type: BackupOperation['type'] = 'backup',
): BackupOperation {
    return {
        id: 'operation-1',
        type,
        status,
        created_at: '2026-10-06T00:00:00Z',
        error: null,
        backup_id: status === 'succeeded' ? 'backup-1' : null,
        safety_backup_id: null,
    };
}

describe('useBackupPolling completion notifications', () => {
    it('notifies the user once when a background backup succeeds', () => {
        const { rerender } = render(
            <BackupPollingHarness operations={[operation('queued')]} />,
        );

        rerender(
            <BackupPollingHarness operations={[operation('succeeded')]} />,
        );
        rerender(
            <BackupPollingHarness operations={[operation('succeeded')]} />,
        );

        expect(mocks.toastSuccess).toHaveBeenCalledOnce();
        expect(mocks.toastError).not.toHaveBeenCalled();
        expect(mocks.refreshNotifications).toHaveBeenCalledOnce();
    });

    it('announces the requested backup when it finished before the page first loaded', () => {
        render(
            <BackupPollingHarness
                operations={[operation('succeeded')]}
                createdOperationId="operation-1"
            />,
        );

        expect(mocks.toastSuccess).toHaveBeenCalledOnce();
        expect(mocks.refreshNotifications).toHaveBeenCalledOnce();
    });

    it('notifies the user once when a background backup fails', () => {
        const { rerender } = render(
            <BackupPollingHarness operations={[operation('running')]} />,
        );

        rerender(<BackupPollingHarness operations={[operation('failed')]} />);
        rerender(<BackupPollingHarness operations={[operation('failed')]} />);

        expect(mocks.toastError).toHaveBeenCalledOnce();
        expect(mocks.toastSuccess).not.toHaveBeenCalled();
        expect(mocks.refreshNotifications).toHaveBeenCalledOnce();
    });

    it('notifies the user when a background backup is interrupted', () => {
        const { rerender } = render(
            <BackupPollingHarness operations={[operation('running')]} />,
        );

        rerender(
            <BackupPollingHarness operations={[operation('interrupted')]} />,
        );

        expect(mocks.toastError).toHaveBeenCalledOnce();
        expect(mocks.refreshNotifications).toHaveBeenCalledOnce();
    });

    it('does not toast historical completions or restore operations', () => {
        const { rerender } = render(
            <BackupPollingHarness operations={[operation('succeeded')]} />,
        );

        rerender(
            <BackupPollingHarness
                operations={[operation('running', 'restore')]}
            />,
        );
        rerender(
            <BackupPollingHarness
                operations={[operation('succeeded', 'restore')]}
            />,
        );

        expect(mocks.toastSuccess).not.toHaveBeenCalled();
        expect(mocks.toastError).not.toHaveBeenCalled();
        expect(mocks.refreshNotifications).not.toHaveBeenCalled();
    });
});
