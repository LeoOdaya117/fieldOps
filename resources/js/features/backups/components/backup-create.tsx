import { useForm } from '@inertiajs/react';
import { DatabaseBackup, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { DetailsPage } from '@/components/details-page';
import { IndexPageSection } from '@/components/index-page';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index, store, upload } from '@/routes/system-settings/backups';
import { useBackupPolling } from '../hooks/use-backup-polling';
import { formatBackupBytes, selectedTableClosure } from '../types';
import type { BackupCreateProps } from '../types';
import { AuditNoteField } from './audit-note-field';
import { BackupReadiness, BackupStatus } from './backup-status';

export function BackupCreate({
    tableCatalog,
    tableCatalogError,
    prerequisites,
    busy,
    operations,
    maxUploadBytes,
}: BackupCreateProps) {
    const form = useForm<{
        scope: 'database' | 'tables';
        requested_tables: string[];
        audit_note: string;
    }>({ scope: 'database', requested_tables: [], audit_note: '' });
    const uploadForm = useForm<{ package: File | null; audit_note: string }>({
        package: null,
        audit_note: '',
    });
    const uploadInput = useRef<HTMLInputElement>(null);
    const [tableSearch, setTableSearch] = useState('');
    const notice = useBackupPolling(busy);
    const ready =
        prerequisites.length > 0 && prerequisites.every((item) => item.ready);
    const pending =
        busy || form.processing || uploadForm.processing || Boolean(notice);
    const disabled = pending || !ready;
    const included = selectedTableClosure(
        form.data.requested_tables,
        tableCatalog,
    );
    const automaticallyIncluded = included.filter(
        (table) => !form.data.requested_tables.includes(table),
    );
    const errors: Record<string, string | undefined> = form.errors;

    return (
        <DetailsPage
            title="Create backup"
            description="Save the full database or a selection of tables. Upload an existing signed package for later recovery."
            backHref={index.url()}
            backLabel="Back to backups"
        >
            <BackupStatus busy={busy} notice={notice} operations={operations} />
            <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <IndexPageSection title="New backup" headingLevel={2}>
                    <form
                        className="space-y-6 p-5 sm:p-6"
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (
                                disabled ||
                                (form.data.scope === 'tables' &&
                                    form.data.requested_tables.length === 0)
                            ) {
                                return;
                            }

                            form.post(store.url(), { preserveScroll: true });
                        }}
                    >
                        <fieldset className="space-y-3" disabled={pending}>
                            <legend className="mb-3 text-sm font-medium">
                                Backup scope
                            </legend>
                            {(
                                [
                                    {
                                        value: 'database',
                                        label: 'Full database',
                                        description:
                                            'Recommended for recovery. Schema, data, views, routines, triggers, and events.',
                                    },
                                    {
                                        value: 'tables',
                                        label: 'Selected tables',
                                        description:
                                            'Schema and data for a recorded selection and its required related tables.',
                                    },
                                ] as const
                            ).map((choice) => (
                                <label
                                    key={choice.value}
                                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm has-checked:border-primary has-checked:bg-accent/40"
                                >
                                    <input
                                        type="radio"
                                        name="scope"
                                        value={choice.value}
                                        checked={
                                            form.data.scope === choice.value
                                        }
                                        onChange={() =>
                                            form.setData('scope', choice.value)
                                        }
                                        className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-ring"
                                    />
                                    <span>
                                        <span className="font-medium">
                                            {choice.label}
                                        </span>
                                        <span className="mt-1 block text-muted-foreground">
                                            {choice.description}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </fieldset>
                        {form.data.scope === 'tables' && (
                            <section
                                className="space-y-4"
                                aria-labelledby="backup-tables-heading"
                            >
                                <div>
                                    <h3
                                        id="backup-tables-heading"
                                        className="text-sm font-semibold"
                                    >
                                        Choose tables
                                    </h3>
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        Required parent and child tables are
                                        automatically included to preserve
                                        relationships. Use a full backup for
                                        triggers, dependent views, routines, or
                                        events.
                                    </p>
                                </div>
                                <InputError
                                    message={tableCatalogError ?? undefined}
                                />
                                <div className="space-y-2">
                                    <Label htmlFor="backup-table-search">
                                        Find a table
                                    </Label>
                                    <Input
                                        id="backup-table-search"
                                        value={tableSearch}
                                        maxLength={255}
                                        onChange={(event) =>
                                            setTableSearch(event.target.value)
                                        }
                                        placeholder="Table name"
                                    />
                                </div>
                                <div
                                    className="max-h-72 overflow-y-auto rounded-md border border-border p-3"
                                    role="group"
                                    aria-label="Available database tables"
                                >
                                    {tableCatalog
                                        .filter((table) =>
                                            table.name
                                                .toLowerCase()
                                                .includes(
                                                    tableSearch.toLowerCase(),
                                                ),
                                        )
                                        .map((table) => (
                                            <div
                                                key={table.name}
                                                className="flex items-center gap-3 py-2"
                                            >
                                                <Checkbox
                                                    id={`backup-table-${table.name}`}
                                                    checked={form.data.requested_tables.includes(
                                                        table.name,
                                                    )}
                                                    disabled={pending}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        form.setData(
                                                            'requested_tables',
                                                            checked === true
                                                                ? [
                                                                      ...form
                                                                          .data
                                                                          .requested_tables,
                                                                      table.name,
                                                                  ]
                                                                : form.data.requested_tables.filter(
                                                                      (name) =>
                                                                          name !==
                                                                          table.name,
                                                                  ),
                                                        )
                                                    }
                                                />
                                                <Label
                                                    htmlFor={`backup-table-${table.name}`}
                                                    className="min-w-0 font-normal break-all"
                                                >
                                                    {table.name}
                                                </Label>
                                            </div>
                                        ))}
                                    {tableCatalog.length === 0 && (
                                        <p className="text-sm text-muted-foreground">
                                            No table catalog is available. Check
                                            database setup before selecting
                                            tables.
                                        </p>
                                    )}
                                    {tableCatalog.length > 0 &&
                                        tableCatalog.every(
                                            (table) =>
                                                !table.name
                                                    .toLowerCase()
                                                    .includes(
                                                        tableSearch.toLowerCase(),
                                                    ),
                                        ) && (
                                            <p className="text-sm text-muted-foreground">
                                                No tables match this search.
                                            </p>
                                        )}
                                </div>
                                <InputError
                                    message={
                                        errors.requested_tables ?? errors.tables
                                    }
                                />
                                <div
                                    aria-live="polite"
                                    className="space-y-3 rounded-md bg-muted/40 p-4 text-sm"
                                >
                                    <p className="font-medium">
                                        {included.length} tables will be backed
                                        up
                                    </p>
                                    <div>
                                        <p className="font-medium">
                                            Requested tables (
                                            {form.data.requested_tables.length})
                                        </p>
                                        <p className="mt-1 break-words text-muted-foreground">
                                            {form.data.requested_tables.length
                                                ? form.data.requested_tables.join(
                                                      ', ',
                                                  )
                                                : 'Select at least one table.'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            Automatically included (
                                            {automaticallyIncluded.length})
                                        </p>
                                        <p className="mt-1 break-words text-muted-foreground">
                                            {automaticallyIncluded.length
                                                ? automaticallyIncluded.join(
                                                      ', ',
                                                  )
                                                : 'No additional tables.'}
                                        </p>
                                    </div>
                                    <p className="leading-6 text-muted-foreground">
                                        Restore replaces this entire recorded
                                        selection. A full backup cannot be
                                        reduced to selected tables during
                                        restore. Custom relationships may need a
                                        deployment review.
                                    </p>
                                </div>
                            </section>
                        )}
                        <AuditNoteField
                            id="create-backup-note"
                            value={form.data.audit_note}
                            onChange={(value) =>
                                form.setData('audit_note', value)
                            }
                            error={form.errors.audit_note}
                            disabled={pending}
                        />
                        <InputError
                            message={
                                errors.operation ??
                                errors.backup ??
                                errors.scope
                            }
                        />
                        <p className="text-sm leading-6 text-muted-foreground">
                            Uploaded files, application code, and encryption
                            keys are excluded. Signed packages are not
                            encrypted; store downloaded packages securely.
                        </p>
                        <Button
                            type="submit"
                            className="min-h-11"
                            disabled={
                                disabled ||
                                (form.data.scope === 'tables' &&
                                    form.data.requested_tables.length === 0)
                            }
                        >
                            <DatabaseBackup
                                aria-hidden="true"
                                className="size-4"
                            />
                            {form.processing
                                ? 'Requesting backup…'
                                : 'Create backup'}
                        </Button>
                    </form>
                </IndexPageSection>
                <div className="space-y-6">
                    <IndexPageSection title="Upload a package" headingLevel={2}>
                        <form
                            className="space-y-4 p-5 sm:p-6"
                            onSubmit={(event) => {
                                event.preventDefault();

                                if (!uploadForm.data.package || disabled) {
                                    return;
                                }

                                uploadForm.post(upload.url(), {
                                    forceFormData: true,
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        uploadForm.reset();

                                        if (uploadInput.current) {
                                            uploadInput.current.value = '';
                                        }
                                    },
                                });
                            }}
                        >
                            <p
                                id="backup-upload-help"
                                className="text-sm leading-6 text-muted-foreground"
                            >
                                Choose a FieldOps .fieldops or .zip package
                                signed by this deployment. Maximum{' '}
                                {formatBackupBytes(maxUploadBytes)}. Upload
                                verifies and saves it; restore is a separate
                                action.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="backup-package">
                                    Backup package
                                </Label>
                                <Input
                                    ref={uploadInput}
                                    id="backup-package"
                                    type="file"
                                    accept=".fieldops,.zip,application/zip"
                                    className="min-h-11 min-w-0"
                                    disabled={pending}
                                    aria-describedby="backup-upload-help backup-upload-error"
                                    aria-invalid={Boolean(
                                        uploadForm.errors.package,
                                    )}
                                    onChange={(event) => {
                                        const file =
                                            event.target.files?.[0] ?? null;
                                        uploadForm.clearErrors();
                                        uploadForm.setData('package', null);

                                        if (
                                            file &&
                                            (!/\.(zip|fieldops)$/i.test(
                                                file.name,
                                            ) ||
                                                file.size > maxUploadBytes)
                                        ) {
                                            uploadForm.setError(
                                                'package',
                                                `Choose a .fieldops or .zip package no larger than ${formatBackupBytes(maxUploadBytes)}.`,
                                            );

                                            return;
                                        }

                                        uploadForm.setData('package', file);
                                    }}
                                />
                                <InputError
                                    id="backup-upload-error"
                                    message={uploadForm.errors.package}
                                />
                            </div>
                            <AuditNoteField
                                id="upload-backup-note"
                                value={uploadForm.data.audit_note}
                                onChange={(value) =>
                                    uploadForm.setData('audit_note', value)
                                }
                                error={uploadForm.errors.audit_note}
                                disabled={pending}
                            />
                            <Button
                                type="submit"
                                className="min-h-11"
                                variant="outline"
                                disabled={disabled || !uploadForm.data.package}
                            >
                                <Upload aria-hidden="true" className="size-4" />
                                {uploadForm.processing
                                    ? 'Uploading…'
                                    : 'Upload package'}
                            </Button>
                            {uploadForm.progress && (
                                <p
                                    role="status"
                                    className="text-sm text-muted-foreground"
                                >
                                    Upload progress:{' '}
                                    {uploadForm.progress.percentage ?? 0}%
                                </p>
                            )}
                        </form>
                    </IndexPageSection>
                    <BackupReadiness prerequisites={prerequisites} />
                </div>
            </div>
        </DetailsPage>
    );
}
