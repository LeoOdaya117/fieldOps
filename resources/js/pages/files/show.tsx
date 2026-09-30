import { router } from '@inertiajs/react';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecordStatusControl } from '@/components/ui/record-status-control';
import {
    FileThumbnail,
    fileKind,
    formatFileSize,
} from '@/features/files/file-display';
import { index as filesIndex, update as filesUpdate } from '@/routes/files';
import type { FileDto } from '@/types';

type Props = {
    file: FileDto;
    canViewDeleted: boolean;
    canUpdateDeleted: boolean;
};

function csrfToken(): string {
    const token = document.cookie
        .split('; ')
        .find((part) => part.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length);

    return token ? decodeURIComponent(token) : '';
}

function TablePreview({ url }: { url: string }) {
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
                {error} You can still download this file.
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
            <p className="text-sm text-muted-foreground">
                This table has no rows to preview.
            </p>
        );
    }

    return (
        <div
            className="max-h-[32rem] overflow-auto rounded-md border border-border"
            role="region"
            aria-label="First rows of file"
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

export default function FileShow({ file, canUpdateDeleted }: Props) {
    const kind = fileKind(file);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(file.name);
    const [tag, setTag] = useState(file.tag ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function mutate(
        method: 'PATCH' | 'DELETE',
        body?: Record<string, string>,
    ) {
        setBusy(true);
        setError(null);

        try {
            const response = await fetch(
                file.updateUrl ?? filesUpdate.url(file.token),
                {
                    method,
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': csrfToken(),
                    },
                    body: body ? JSON.stringify(body) : undefined,
                },
            );

            if (!response.ok) {
                const message = (
                    (await response.json()) as { message?: string }
                ).message;

                throw new Error(message ?? 'The file could not be changed.');
            }

            if (method === 'DELETE') {
                router.visit(filesIndex.url());
            } else {
                setEditing(false);
                router.reload();
            }
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : 'The file could not be changed.',
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <DetailsPage
            title={file.name}
            description="Preview the file, review its metadata, and manage its availability."
            backHref={filesIndex.url()}
            backLabel="Back to files"
            actions={
                <>
                    <Button asChild>
                        <a href={file.downloadUrl}>
                            <Download aria-hidden="true" />
                            Download
                        </a>
                    </Button>
                    {file.canUpdate && (
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setEditing((value) => !value)}
                        >
                            <Pencil aria-hidden="true" />
                            Edit
                        </Button>
                    )}
                    {file.canDelete && (
                        <Button
                            variant="outline"
                            type="button"
                            disabled={busy || file.assigned}
                            onClick={() => {
                                if (
                                    window.confirm(`Deactivate ${file.name}?`)
                                ) {
                                    void mutate('DELETE');
                                }
                            }}
                        >
                            <Trash2 aria-hidden="true" />
                            Delete
                        </Button>
                    )}
                </>
            }
        >
            <div className="min-w-0 space-y-6">
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
                {editing && (
                    <form
                        className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void mutate('PATCH', { name, tag });
                        }}
                    >
                        <label className="grid gap-1.5 text-sm font-medium">
                            Name
                            <Input
                                value={name}
                                maxLength={255}
                                required
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                            />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                            Tag
                            <Input
                                value={tag}
                                maxLength={64}
                                onChange={(event) => setTag(event.target.value)}
                            />
                        </label>
                        <Button type="submit" disabled={busy}>
                            Save
                        </Button>
                    </form>
                )}
                <DetailsView
                    record={file}
                    summary={
                        <div className="flex min-w-0 items-center gap-4">
                            <FileThumbnail
                                file={file}
                                className="size-14 shrink-0"
                            />
                            <div className="min-w-0">
                                <h2 className="text-lg font-semibold break-words">
                                    {file.name}
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {file.module} ·{' '}
                                    {formatFileSize(file.sizeBytes)}
                                </p>
                            </div>
                        </div>
                    }
                    sections={[
                        {
                            key: 'preview',
                            title: 'Preview',
                            description:
                                'Inspect the file without downloading it.',
                            content:
                                kind === 'image' ? (
                                    <img
                                        src={file.contentUrl}
                                        alt={file.name}
                                        className="mx-auto max-h-[36rem] max-w-full object-contain"
                                    />
                                ) : kind === 'pdf' ? (
                                    <iframe
                                        src={file.contentUrl}
                                        title={`Preview of ${file.name}`}
                                        className="h-[40rem] w-full rounded-md border border-border"
                                    />
                                ) : kind === 'table' && file.previewDataUrl ? (
                                    <TablePreview url={file.previewDataUrl} />
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        A preview is not available for this
                                        file. Download it to inspect its
                                        contents.
                                    </p>
                                ),
                        },
                        {
                            key: 'details',
                            title: 'File details',
                            columns: [
                                {
                                    key: 'name',
                                    label: 'Name',
                                    accessor: 'name',
                                    valueClassName: 'break-words',
                                },
                                {
                                    key: 'type',
                                    label: 'Type',
                                    cell: (record) =>
                                        record.extension.toUpperCase(),
                                },
                                {
                                    key: 'size',
                                    label: 'Size',
                                    cell: (record) =>
                                        formatFileSize(record.sizeBytes),
                                },
                                {
                                    key: 'dimensions',
                                    label: 'Dimensions',
                                    cell: (record) =>
                                        record.width && record.height
                                            ? `${record.width} × ${record.height} px`
                                            : 'Not applicable',
                                },
                                {
                                    key: 'module',
                                    label: 'Module',
                                    accessor: 'module',
                                },
                                {
                                    key: 'tag',
                                    label: 'Tag',
                                    cell: (record) => record.tag || 'None',
                                },
                                {
                                    key: 'uploaded',
                                    label: 'Uploaded',
                                    cell: (record) =>
                                        new Date(
                                            record.createdAt,
                                        ).toLocaleString(),
                                },
                            ],
                        },
                        {
                            key: 'status',
                            title: 'Record status',
                            content: (
                                <RecordStatusControl
                                    recordStatus={file.recordStatus}
                                    label={file.name}
                                    canUpdateDeleted={canUpdateDeleted}
                                    recordStatusUrl={file.recordStatusUrl}
                                />
                            ),
                        },
                    ]}
                />
            </div>
        </DetailsPage>
    );
}
