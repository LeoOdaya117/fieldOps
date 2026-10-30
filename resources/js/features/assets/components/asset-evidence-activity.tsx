import { Link, router, useForm } from '@inertiajs/react';
import {
    Download,
    File as FileIcon,
    FileText,
    Trash2,
    Upload,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatFileSize } from '@/features/files/file-display';
import { formatDateTime } from '@/lib/format-date';
import type {
    AssetActivityPage,
    AssetEvidence,
    AssetHistoryEvent,
} from '@/features/assets/types';

const acceptedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function Pagination({ page }: { page: AssetActivityPage<unknown> }) {
    const previous = page.links.find((link) => /previous/i.test(link.label));
    const next = page.links.find((link) => /next/i.test(link.label));

    if (page.last_page <= 1) {
        return null;
    }

    return (
        <nav
            aria-label="Activity pages"
            className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm"
        >
            {previous?.url ? (
                <Link
                    className="text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    href={previous.url}
                >
                    Previous
                </Link>
            ) : (
                <span className="text-muted-foreground">Previous</span>
            )}
            <span className="text-muted-foreground">
                Page {page.current_page} of {page.last_page}
            </span>
            {next?.url ? (
                <Link
                    className="text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    href={next.url}
                >
                    Next
                </Link>
            ) : (
                <span className="text-muted-foreground">Next</span>
            )}
        </nav>
    );
}

function eventLabel(event: string): string {
    return event
        .replace(/^asset\./, '')
        .replaceAll('.', ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const historyLabels: Record<string, string> = {
    code: 'Asset code',
    name: 'Name',
    category: 'Category',
    condition: 'Condition',
    latitude: 'Latitude',
    longitude: 'Longitude',
    record_status: 'Record status',
    mime_type: 'File type',
    size_bytes: 'File size',
    removed: 'Attachment',
};

function historyChanges(event: AssetHistoryEvent) {
    return Object.keys(historyLabels)
        .filter((key) => event.changes.before[key] !== event.changes.after[key])
        .map((key) => {
            const format = (
                value: string | number | boolean | null | undefined,
            ) => {
                if (value === null || value === undefined) {
                    return '—';
                }

                if (key === 'record_status') {
                    return Number(value) === 1 ? 'Active' : 'Inactive';
                }

                if (key === 'size_bytes') {
                    return formatFileSize(Number(value));
                }

                if (key === 'removed' && value === true) {
                    return 'Removed';
                }

                return String(value);
            };

            const label =
                key === 'name' &&
                ('mime_type' in event.changes.after ||
                    'mime_type' in event.changes.before)
                    ? 'Evidence file'
                    : historyLabels[key];

            return `${label}: ${format(event.changes.before[key])} → ${format(event.changes.after[key])}`;
        });
}

function EvidenceTablePreview({ url }: { url: string }) {
    const [rows, setRows] = useState<string[][] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch(url, {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
            .then(async (response) => {
                const body = (await response.json()) as {
                    rows?: string[][];
                    message?: string;
                };

                if (!response.ok) {
                    throw new Error(body.message ?? 'Preview unavailable.');
                }

                setRows(body.rows ?? []);
            })
            .catch((reason: unknown) => {
                if (!controller.signal.aborted) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Preview unavailable.',
                    );
                }
            });

        return () => controller.abort();
    }, [url]);

    if (error) {
        return (
            <p role="status" className="text-sm text-muted-foreground">
                {error} You can still download this evidence.
            </p>
        );
    }

    if (!rows) {
        return (
            <p role="status" className="text-sm text-muted-foreground">
                Loading preview…
            </p>
        );
    }

    if (rows.length === 0) {
        return (
            <p role="status" className="text-sm text-muted-foreground">
                This file has no rows to preview.
            </p>
        );
    }

    return (
        <div
            className="max-h-64 max-w-full overflow-auto rounded-md border border-border"
            role="region"
            aria-label="First rows of evidence"
            tabIndex={0}
        >
            <table className="min-w-full border-collapse text-left text-sm">
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className="border-b border-border last:border-0"
                        >
                            {row.map((cell, columnIndex) => (
                                <td
                                    key={columnIndex}
                                    className="max-w-80 min-w-24 truncate border-r border-border px-3 py-2 align-top last:border-0"
                                    title={cell}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function AssetEvidenceActivity({
    evidence,
    history,
    canManageEvidence,
    storeUrl,
}: {
    evidence: AssetActivityPage<AssetEvidence>;
    history: AssetActivityPage<AssetHistoryEvent>;
    canManageEvidence: boolean;
    storeUrl: string;
}) {
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [previewingId, setPreviewingId] = useState<number | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const form = useForm<{ file: File | null }>({ file: null });

    function upload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!form.data.file) {
            return;
        }

        form.post(storeUrl, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();

                if (fileInput.current) {
                    fileInput.current.value = '';
                }

                router.reload({ only: ['evidence', 'history'] });
            },
        });
    }

    function remove(item: AssetEvidence) {
        setRemovingId(item.id);
        router.delete(item.removeUrl, {
            preserveScroll: true,
            onFinish: () => setRemovingId(null),
            onSuccess: () => router.reload({ only: ['evidence', 'history'] }),
        });
    }

    return (
        <div className="space-y-8">
            <section
                aria-labelledby="asset-evidence-heading"
                className="space-y-4"
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 id="asset-evidence-heading" className="font-medium">
                            Evidence files
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Private files linked to this asset.
                        </p>
                    </div>
                    {canManageEvidence ? (
                        <form
                            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row"
                            onSubmit={upload}
                        >
                            <Input
                                ref={fileInput}
                                className="h-auto min-h-9 w-full py-1.5 text-sm sm:max-w-72"
                                type="file"
                                accept={acceptedTypes.join(',')}
                                aria-label="Add evidence files"
                                aria-invalid={Boolean(form.errors.file)}
                                aria-describedby={
                                    form.errors.file
                                        ? 'asset-evidence-error'
                                        : undefined
                                }
                                onChange={(event) =>
                                    form.setData(
                                        'file',
                                        event.currentTarget.files?.[0] ?? null,
                                    )
                                }
                            />
                            <Button
                                type="submit"
                                disabled={!form.data.file || form.processing}
                            >
                                <Upload aria-hidden="true" />
                                {form.processing ? 'Uploading…' : 'Upload'}
                            </Button>
                        </form>
                    ) : null}
                </div>

                {form.errors.file ? (
                    <p
                        id="asset-evidence-error"
                        role="alert"
                        className="text-sm text-destructive"
                    >
                        {form.errors.file}
                    </p>
                ) : null}
                {form.processing ? (
                    <div
                        aria-live="polite"
                        className="space-y-1 text-sm text-muted-foreground"
                    >
                        <p>Uploading {form.data.file?.name}</p>
                        <progress
                            className="h-1 w-full accent-primary"
                            max={100}
                            value={form.progress?.percentage ?? 0}
                            aria-label="Evidence upload progress"
                        />
                    </div>
                ) : null}

                {evidence.data.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        No evidence files have been added.
                    </p>
                ) : (
                    <ul className="divide-y divide-border rounded-md border border-border">
                        {evidence.data.map((item) => (
                            <li
                                key={item.id}
                                className="flex min-w-0 flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    {item.mimeType.startsWith('image/') &&
                                    item.thumbnailUrl ? (
                                        <a
                                            href={item.contentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={`Preview ${item.name}`}
                                            className="block size-14 shrink-0 overflow-hidden rounded border border-border focus-visible:outline-2 focus-visible:outline-ring"
                                        >
                                            <img
                                                src={item.thumbnailUrl}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        </a>
                                    ) : item.mimeType === 'application/pdf' ? (
                                        <a
                                            href={item.contentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={`Preview ${item.name}`}
                                            className="flex size-14 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                                        >
                                            <FileText aria-hidden="true" />
                                        </a>
                                    ) : (
                                        <span className="flex size-14 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
                                            <FileIcon aria-hidden="true" />
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <a
                                            href={item.contentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block truncate font-medium text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                                        >
                                            {item.name}
                                        </a>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {item.mimeType} ·{' '}
                                            {formatFileSize(item.sizeBytes)}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Added by{' '}
                                            {item.actorName ?? 'Unknown user'} ·{' '}
                                            {formatDateTime(item.createdAt)}
                                        </p>
                                        {item.previewDataUrl ? (
                                            <div className="mt-2 space-y-2">
                                                <Button
                                                    type="button"
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto px-0"
                                                    aria-expanded={
                                                        previewingId === item.id
                                                    }
                                                    onClick={() =>
                                                        setPreviewingId(
                                                            (current) =>
                                                                current ===
                                                                item.id
                                                                    ? null
                                                                    : item.id,
                                                        )
                                                    }
                                                >
                                                    {previewingId === item.id
                                                        ? 'Hide preview'
                                                        : 'Preview rows'}
                                                </Button>
                                                {previewingId === item.id ? (
                                                    <EvidenceTablePreview
                                                        key={item.id}
                                                        url={
                                                            item.previewDataUrl
                                                        }
                                                    />
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                                    <a
                                        href={item.downloadUrl}
                                        className="inline-flex min-h-9 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                                    >
                                        <Download
                                            aria-hidden="true"
                                            className="size-4"
                                        />{' '}
                                        Download
                                    </a>
                                    {canManageEvidence ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Remove ${item.name}`}
                                            disabled={removingId === item.id}
                                            onClick={() => remove(item)}
                                        >
                                            <Trash2 aria-hidden="true" />
                                        </Button>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                <Pagination page={evidence} />
            </section>

            <section
                aria-labelledby="asset-history-heading"
                className="space-y-4 border-t border-border pt-6"
            >
                <div>
                    <h3 id="asset-history-heading" className="font-medium">
                        Activity history
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Existing audit records are shown; activity from before
                        asset auditing was not backfilled.
                    </p>
                </div>
                {history.data.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        No activity has been recorded yet.
                    </p>
                ) : (
                    <ol className="space-y-3">
                        {history.data.map((event) => (
                            <li
                                key={event.id}
                                className="border-l-2 border-border pl-4"
                            >
                                <p className="text-sm font-medium">
                                    {eventLabel(event.event)}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {event.actorName ?? 'Unknown user'} ·{' '}
                                    {formatDateTime(event.occurredAt)}
                                </p>
                                {historyChanges(event).length > 0 ? (
                                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                        {historyChanges(event).map((change) => (
                                            <li
                                                key={change}
                                                className="break-words"
                                            >
                                                {change}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </li>
                        ))}
                    </ol>
                )}
                <Pagination page={history} />
            </section>
        </div>
    );
}
