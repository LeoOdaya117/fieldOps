import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type ConfirmationOptions = {
    title?: string;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
};

type ConfirmDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options?: ConfirmationOptions;
    destructive?: boolean;
    onConfirm: () => void;
};

function ConfirmDialog({
    open,
    onOpenChange,
    options,
    destructive = false,
    onConfirm,
}: ConfirmDialogProps) {
    const title = options?.title ?? 'Confirm action';
    const description =
        options?.description ??
        'This action may change access or data. Do you want to continue?';
    const confirmLabel = options?.confirmLabel ?? 'Continue';
    const cancelLabel = options?.cancelLabel ?? 'Cancel';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                data-slot="confirm-dialog"
                className="sm:max-w-md"
            >
                <DialogHeader>
                    <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="size-5" aria-hidden="true" />
                    </div>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        variant={destructive ? 'destructive' : 'default'}
                        onClick={() => {
                            onOpenChange(false);
                            onConfirm();
                        }}
                    >
                        {confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { ConfirmDialog };
