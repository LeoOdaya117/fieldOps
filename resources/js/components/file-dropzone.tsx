import { UploadCloud, X, RotateCcw } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { UploadEntry } from '@/features/files/hooks/use-file-uploads';
import { cn } from '@/lib/utils';

type Props<T> = {
    label: string;
    hint: string;
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    entries: UploadEntry<T>[];
    error: string | null;
    onFiles: (files: File[]) => void;
    onRetry: (id: string) => void;
    onRemove: (id: string) => void;
    className?: string;
};

export function FileDropzone<T>({
    label,
    hint,
    accept,
    multiple = false,
    disabled = false,
    entries,
    error,
    onFiles,
    onRetry,
    onRemove,
    className,
}: Props<T>) {
    const id = useId();
    const input = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const choose = (files: FileList | null) => {
        if (files?.length) {
            onFiles(Array.from(files));
        }
    };

    return (
        <div className={className}>
            <div
                className={cn(
                    'flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none sm:min-h-52',
                    dragging && 'border-primary bg-accent/40',
                    disabled && 'opacity-60',
                )}
                role="button"
                tabIndex={disabled ? -1 : 0}
                aria-disabled={disabled}
                aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
                onClick={() => {
                    if (!disabled) {
                        input.current?.click();
                    }
                }}
                onKeyDown={(event) => {
                    if (
                        !disabled &&
                        (event.key === 'Enter' || event.key === ' ')
                    ) {
                        event.preventDefault();
                        input.current?.click();
                    }
                }}
                onDragEnter={(event) => {
                    event.preventDefault();

                    if (!disabled) {
                        setDragging(true);
                    }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                    if (
                        !event.currentTarget.contains(
                            event.relatedTarget as Node,
                        )
                    ) {
                        setDragging(false);
                    }
                }}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);

                    if (!disabled) {
                        choose(event.dataTransfer.files);
                    }
                }}
            >
                <UploadCloud
                    className="size-7 text-muted-foreground"
                    aria-hidden="true"
                />
                <span className="mt-3 text-sm font-semibold">{label}</span>
                <span
                    id={`${id}-hint`}
                    className="mt-1 text-xs leading-5 text-muted-foreground"
                >
                    {hint}
                </span>
                <input
                    ref={input}
                    type="file"
                    className="sr-only"
                    aria-label={label}
                    accept={accept}
                    multiple={multiple}
                    disabled={disabled}
                    onChange={(event) => {
                        choose(event.currentTarget.files);
                        event.currentTarget.value = '';
                    }}
                />
            </div>
            {error && (
                <p
                    id={`${id}-error`}
                    role="alert"
                    className="mt-2 text-sm text-destructive"
                >
                    {error}
                </p>
            )}
            {entries.length > 0 && (
                <ul
                    className="mt-3 divide-y divide-border rounded-lg border border-border"
                    aria-label="Upload queue"
                >
                    {entries.map((entry) => (
                        <li
                            key={entry.id}
                            className="flex min-w-0 items-center gap-3 px-3 py-2 text-sm"
                        >
                            <div className="min-w-0 flex-1">
                                <p
                                    className="truncate font-medium"
                                    title={entry.file.name}
                                >
                                    {entry.file.name}
                                </p>
                                <p
                                    className={cn(
                                        'text-xs text-muted-foreground',
                                        entry.status === 'failed' &&
                                            'text-destructive',
                                    )}
                                    role={
                                        entry.status === 'failed'
                                            ? 'alert'
                                            : undefined
                                    }
                                >
                                    {entry.status === 'uploading'
                                        ? `Uploading ${entry.progress}%`
                                        : entry.status === 'complete'
                                          ? 'Uploaded'
                                          : entry.error}
                                </p>
                                {entry.status === 'uploading' && (
                                    <progress
                                        className="mt-1 h-1 w-full accent-primary"
                                        max={100}
                                        value={entry.progress}
                                        aria-label={`${entry.file.name} progress`}
                                    />
                                )}
                            </div>
                            {entry.status === 'failed' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRetry(entry.id)}
                                    aria-label={`Retry ${entry.file.name}`}
                                >
                                    <RotateCcw className="size-4" />
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemove(entry.id)}
                                aria-label={`Remove ${entry.file.name}`}
                            >
                                <X className="size-4" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
