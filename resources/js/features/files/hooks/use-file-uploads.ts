import { useCallback, useEffect, useRef, useState } from 'react';

export type UploadEntry<T> = {
    id: string;
    file: File;
    progress: number;
    status: 'uploading' | 'failed' | 'complete';
    error: string | null;
    result: T | null;
};

type UploadOptions<T> = {
    url: string;
    maxFiles: number;
    maxBytes: number;
    accept?: string[];
    fields?: Record<string, string>;
    onUploaded?: (value: T) => void;
};

let uploadEntrySequence = 0;

function nextUploadEntryId(): string {
    // This is only a local UI key; the server assigns the file's opaque token.
    uploadEntrySequence += 1;

    return `upload-${Date.now()}-${uploadEntrySequence}`;
}

function csrfToken(): string {
    const token = document.cookie
        .split('; ')
        .find((part) => part.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length);

    return token ? decodeURIComponent(token) : '';
}

function uploadMessage(xhr: XMLHttpRequest): string {
    try {
        const response = JSON.parse(xhr.responseText) as {
            message?: string;
            errors?: Record<string, string[]>;
        };

        return (
            response.errors?.file?.[0] ??
            response.message ??
            'Upload failed. Try again.'
        );
    } catch {
        return xhr.status === 429
            ? 'Too many uploads. Wait a minute and try again.'
            : 'Upload failed. Check your connection and try again.';
    }
}

export function useFileUploads<T>(options: UploadOptions<T>) {
    const [entries, setEntries] = useState<UploadEntry<T>[]>([]);
    const [error, setError] = useState<string | null>(null);
    const requests = useRef(new Map<string, XMLHttpRequest>());
    const entriesRef = useRef<UploadEntry<T>[]>([]);
    const optionsRef = useRef(options);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    const update = useCallback((next: UploadEntry<T>[]) => {
        entriesRef.current = next;
        setEntries(next);
    }, []);

    const replace = useCallback(
        (id: string, changes: Partial<UploadEntry<T>>) => {
            update(
                entriesRef.current.map((entry) =>
                    entry.id === id ? { ...entry, ...changes } : entry,
                ),
            );
        },
        [update],
    );

    const send = useCallback(
        (
            id: string,
            file: File,
            fields: Record<string, string>,
        ): Promise<T | null> => {
            replace(id, { status: 'uploading', progress: 0, error: null });

            return new Promise((resolve) => {
                const xhr = new XMLHttpRequest();
                const body = new FormData();
                body.append('file', file);
                Object.entries(fields).forEach(([key, value]) =>
                    body.append(key, value),
                );
                requests.current.set(id, xhr);
                xhr.open('POST', optionsRef.current.url);
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xhr.setRequestHeader('X-XSRF-TOKEN', csrfToken());
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable && event.total > 0) {
                        replace(id, {
                            progress: Math.round(
                                (event.loaded / event.total) * 100,
                            ),
                        });
                    }
                });
                xhr.addEventListener('load', () => {
                    requests.current.delete(id);

                    if (xhr.status < 200 || xhr.status >= 300) {
                        replace(id, {
                            status: 'failed',
                            error: uploadMessage(xhr),
                        });
                        resolve(null);

                        return;
                    }

                    try {
                        const response = JSON.parse(xhr.responseText) as {
                            data: T;
                        };

                        if (!response.data) {
                            throw new Error('Missing uploaded file');
                        }

                        replace(id, {
                            status: 'complete',
                            progress: 100,
                            result: response.data,
                        });
                        optionsRef.current.onUploaded?.(response.data);
                        resolve(response.data);
                    } catch {
                        replace(id, {
                            status: 'failed',
                            error: 'The server returned an invalid upload response.',
                        });
                        resolve(null);
                    }
                });
                xhr.addEventListener('error', () => {
                    requests.current.delete(id);
                    replace(id, {
                        status: 'failed',
                        error: 'Upload interrupted. Try again.',
                    });
                    resolve(null);
                });
                xhr.addEventListener('abort', () => {
                    requests.current.delete(id);
                    resolve(null);
                });
                xhr.send(body);
            });
        },
        [replace],
    );

    const addFiles = useCallback(
        async (
            files: File[],
            fields: Record<string, string> = {},
        ): Promise<T[]> => {
            const settings = optionsRef.current;
            const available = Math.max(
                0,
                settings.maxFiles -
                    entriesRef.current.filter(
                        (entry) => entry.status !== 'complete',
                    ).length,
            );

            if (files.length > available) {
                setError(
                    `Choose up to ${settings.maxFiles} files at a time. Remove a file before adding more.`,
                );

                return [];
            }

            const invalid = files.find(
                (file) =>
                    file.size > settings.maxBytes ||
                    (settings.accept && !settings.accept.includes(file.type)),
            );

            if (invalid) {
                setError(
                    invalid.size > settings.maxBytes
                        ? `${invalid.name} exceeds the ${Math.round(settings.maxBytes / 1024 / 1024)} MB limit.`
                        : `${invalid.name} is not an accepted file type.`,
                );

                return [];
            }

            setError(null);
            const pending = files.map((file) => ({
                id: nextUploadEntryId(),
                file,
                progress: 0,
                status: 'uploading' as const,
                error: null,
                result: null,
            }));
            update([...entriesRef.current, ...pending]);
            const results = await Promise.all(
                pending.map((entry) =>
                    send(entry.id, entry.file, {
                        ...settings.fields,
                        ...fields,
                    }),
                ),
            );

            return results.filter((result) => result !== null) as T[];
        },
        [send, update],
    );

    const retry = useCallback(
        async (id: string): Promise<T | null> => {
            const entry = entriesRef.current.find((item) => item.id === id);

            if (!entry || entry.status !== 'failed') {
                return null;
            }

            return send(id, entry.file, optionsRef.current.fields ?? {});
        },
        [send],
    );

    const remove = useCallback(
        (id: string) => {
            requests.current.get(id)?.abort();
            requests.current.delete(id);
            update(entriesRef.current.filter((entry) => entry.id !== id));
        },
        [update],
    );

    useEffect(
        () => () => {
            requests.current.forEach((request) => request.abort());
            requests.current.clear();
        },
        [],
    );

    return {
        entries,
        error,
        addFiles,
        retry,
        remove,
        clearError: () => setError(null),
    };
}
