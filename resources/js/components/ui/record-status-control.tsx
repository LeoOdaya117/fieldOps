import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export type RecordStatusControlProps = {
    recordStatus: number;
    label: string;
    canUpdateDeleted?: boolean;
    recordStatusUrl?: string | null;
    onStatusChange?: (recordStatus: 0 | 1) => Promise<void>;
};

export function RecordStatusControl({
    recordStatus,
    label,
    canUpdateDeleted = false,
    recordStatusUrl,
    onStatusChange,
}: RecordStatusControlProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isActive = Number(recordStatus) === 1;
    const nextStatus = isActive ? 0 : 1;
    const nextLabel = nextStatus === 1 ? 'Active' : 'Inactive';

    if (!canUpdateDeleted || !recordStatusUrl) {
        return (
            <Badge
                variant="outline"
                className={isActive
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-muted-foreground/30 bg-muted text-muted-foreground'}
            >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                {isActive ? 'Active' : 'Inactive'}
            </Badge>
        );
    }

    return (
        <div className="inline-flex flex-col items-start gap-1">
            <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-9 justify-start gap-2 px-1.5 py-1 text-xs font-semibold text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                role="switch"
                aria-checked={isActive}
                aria-label={`${isActive ? 'Deactivate' : 'Activate'} ${label}`}
                disabled={processing}
                onClick={() => setConfirmOpen(true)}
            >
                <span aria-hidden="true" className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${isActive ? 'border-success/40 bg-success/80' : 'border-border bg-muted'}`}>
                    <span className={`size-3.5 rounded-full bg-background shadow-sm transition-transform ${isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </span>
                <span>{isActive ? 'Active' : 'Inactive'}</span>
            </Button>
            {error ? <span role="alert" className="text-xs text-destructive">{error}</span> : null}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                destructive={nextStatus === 0}
                options={{
                    title: `${nextLabel === 'Active' ? 'Activate' : 'Deactivate'} ${label}?`,
                    description: nextLabel === 'Active'
                        ? `This will restore ${label} to active lists.`
                        : `This will mark ${label} inactive while retaining its audit history.`,
                    confirmLabel: nextLabel,
                }}
                onConfirm={() => {
                    setProcessing(true);
                    setError(null);

                    if (onStatusChange) {
                        void onStatusChange(nextStatus)
                            .catch(() =>
                                setError(
                                    `Could not update ${label} status. Please try again.`,
                                ),
                            )
                            .finally(() => setProcessing(false));
                    } else {
                        router.patch(recordStatusUrl, { record_status: nextStatus }, {
                            preserveScroll: true,
                            onError: () => setError(`Could not update ${label} status. Please try again.`),
                            onFinish: () => setProcessing(false),
                        });
                    }
                }}
            />
        </div>
    );
}
