import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { restore } from '@/routes/system-settings/backups';
import { formatBackupDate } from '../types';
import type { Backup } from '../types';
import { AuditNoteField } from './audit-note-field';

export function RestoreDialog({
    backup,
    databaseName,
    disabled,
    onClose,
}: {
    backup: Backup;
    databaseName: string;
    disabled: boolean;
    onClose: () => void;
}) {
    const form = useForm({ database_name: '', audit_note: '' });
    const errors: Record<string, string | undefined> = form.errors;
    const selected = backup.scope === 'tables';
    const automatic = (backup.tables ?? []).filter(
        (table) => !backup.requested_tables?.includes(table),
    );

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open && !form.processing) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {selected
                            ? 'Restore selected tables?'
                            : 'Restore database?'}
                    </DialogTitle>
                    <DialogDescription>
                        Restore the backup created{' '}
                        {formatBackupDate(backup.created_at)}.{' '}
                        {selected
                            ? 'This replaces the entire recorded table selection, including required related tables.'
                            : 'This replaces the entire database, including users, roles, and settings.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm leading-6">
                    {selected && (
                        <div
                            className="max-h-48 space-y-2 overflow-auto rounded-md bg-muted/40 p-3"
                            role="region"
                            aria-label="Restore table selection"
                            tabIndex={0}
                        >
                            <p className="font-medium">
                                Requested tables (
                                {backup.requested_tables?.length ?? 0})
                            </p>
                            <p className="break-words">
                                {backup.requested_tables?.join(', ') ??
                                    'Unavailable'}
                            </p>
                            <p className="font-medium">
                                Automatically included ({automatic.length})
                            </p>
                            <p className="break-words">
                                {automatic.join(', ') || 'None'}
                            </p>
                            <p className="text-muted-foreground">
                                Tables outside this selection are preserved. You
                                cannot remove tables from the package during
                                restore.
                            </p>
                        </div>
                    )}
                    <p>
                        The application enters maintenance mode. Everyone must
                        sign in again after recovery. A safety backup is created
                        before replacement.
                    </p>
                    <p className="text-muted-foreground">
                        Runtime sessions, queued jobs, and caches are cleared
                        after recovery, including selected-table recovery.
                    </p>
                    <p className="text-muted-foreground">
                        Uploaded files are excluded. Keep the original
                        application key and files separately. If recovery fails,
                        maintenance stays enabled and a server operator must
                        recover using the CLI.
                    </p>
                </div>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (
                            form.data.database_name !== databaseName ||
                            disabled ||
                            form.processing
                        ) {
                            return;
                        }

                        form.post(restore.url(backup.id), {
                            preserveScroll: true,
                            onSuccess: onClose,
                        });
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="restore-database-name">
                            Type the database name:{' '}
                            <span className="font-semibold break-all">
                                {databaseName}
                            </span>
                        </Label>
                        <Input
                            id="restore-database-name"
                            autoComplete="off"
                            value={form.data.database_name}
                            onChange={(event) =>
                                form.setData(
                                    'database_name',
                                    event.target.value,
                                )
                            }
                            aria-invalid={Boolean(form.errors.database_name)}
                            aria-describedby={
                                form.errors.database_name
                                    ? 'restore-database-error'
                                    : undefined
                            }
                            disabled={form.processing}
                        />
                        <InputError
                            id="restore-database-error"
                            message={form.errors.database_name}
                        />
                        <InputError
                            message={errors.backup ?? errors.operation}
                        />
                    </div>
                    <AuditNoteField
                        id="restore-backup-note"
                        value={form.data.audit_note}
                        onChange={(value) => form.setData('audit_note', value)}
                        error={form.errors.audit_note}
                        disabled={form.processing}
                    />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={
                                disabled ||
                                form.processing ||
                                form.data.database_name !== databaseName
                            }
                        >
                            {form.processing
                                ? 'Requesting restore…'
                                : selected
                                  ? 'Replace selected tables'
                                  : 'Replace database'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
