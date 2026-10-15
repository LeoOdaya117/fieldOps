import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { destroy } from '@/routes/system-settings/backups';
import { RestoreDialog } from '../components/restore-dialog';
import type { Backup } from '../types';

export function useBackupActions({
    databaseName,
    busy,
    ready,
}: {
    databaseName: string;
    busy: boolean;
    ready: boolean;
}) {
    const form = useForm({});
    const [restoring, setRestoring] = useState<Backup | null>(null);
    const [deleting, setDeleting] = useState<Backup | null>(null);
    const error = Object.values(form.errors)[0];
    const pending = busy || form.processing;
    const dialogs = (
        <>
            {restoring && (
                <RestoreDialog
                    key={restoring.id}
                    backup={restoring}
                    databaseName={databaseName}
                    disabled={pending || !ready}
                    onClose={() => setRestoring(null)}
                />
            )}
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleting(null);
                    }
                }}
                destructive
                options={{
                    title: 'Delete backup?',
                    description:
                        'This permanently removes the saved package. Its audit history is retained. Keep a downloaded copy if you need it for future recovery.',
                    confirmLabel: 'Delete backup',
                }}
                onConfirm={() => {
                    if (deleting && !pending && !deleting.protected) {
                        form.delete(destroy.url(deleting.id), {
                            preserveScroll: true,
                        });
                    }
                }}
            />
        </>
    );

    return {
        pending,
        error: typeof error === 'string' ? error : undefined,
        onRestore: setRestoring,
        onDelete: setDeleting,
        dialogs,
    };
}
