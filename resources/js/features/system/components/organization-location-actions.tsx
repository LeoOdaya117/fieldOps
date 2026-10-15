import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { RecordStatusControl } from '@/components/ui/record-status-control';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type OrganizationLocationActionsProps = {
    label: string;
    recordStatus: number | null;
    recordStatusUrl: string | null;
    deleteUrl: string | null;
    canUpdateDeleted: boolean;
    canDelete: boolean;
    canUpdateSettings: boolean;
};

export function OrganizationLocationActions({
    label,
    recordStatus,
    recordStatusUrl,
    deleteUrl,
    canUpdateDeleted,
    canDelete,
    canUpdateSettings,
}: OrganizationLocationActionsProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    return (
        <div className="flex flex-wrap items-center gap-3">
            {recordStatus !== null ? (
                <RecordStatusControl
                    recordStatus={recordStatus}
                    recordStatusUrl={recordStatusUrl}
                    canUpdateDeleted={canUpdateDeleted}
                    label={label}
                />
            ) : null}
            {canDelete && canUpdateSettings && deleteUrl ? (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        setError(null);
                        setConfirmOpen(true);
                    }}
                >
                    <Trash2 aria-hidden="true" />
                    Deactivate location
                </Button>
            ) : null}
            {error ? (
                <span role="alert" className="text-sm text-destructive">
                    {error}
                </span>
            ) : null}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                destructive
                options={{
                    title: 'Deactivate the organization location?',
                    description:
                        'The address and coordinates will be retained and can be restored later.',
                    confirmLabel: 'Deactivate location',
                }}
                onConfirm={() => {
                    if (!deleteUrl) {
                        return;
                    }

                    router.delete(deleteUrl, {
                        preserveScroll: true,
                        onSuccess: () => setConfirmOpen(false),
                        onError: () =>
                            setError(
                                'The organization location could not be deactivated.',
                            ),
                    });
                }}
            />
        </div>
    );
}
