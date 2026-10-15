import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFileUploads } from '@/features/files/hooks/use-file-uploads';

class SuccessfulUploadRequest {
    status = 201;
    responseText = JSON.stringify({ data: { token: 'saved-file' } });
    upload = { addEventListener: vi.fn() };
    private listeners = new Map<string, () => void>();

    open() {}

    setRequestHeader() {}

    addEventListener(event: string, listener: () => void) {
        this.listeners.set(event, listener);
    }

    send() {
        this.listeners.get('load')?.();
    }

    abort() {
        this.listeners.get('abort')?.();
    }
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useFileUploads', () => {
    it('uploads files when crypto.randomUUID is unavailable', async () => {
        vi.stubGlobal('crypto', { randomUUID: undefined });
        vi.stubGlobal('XMLHttpRequest', SuccessfulUploadRequest);
        const onUploaded = vi.fn();
        const { result } = renderHook(() =>
            useFileUploads<{ token: string }>({
                url: '/files',
                maxFiles: 3,
                maxBytes: 1024,
                onUploaded,
            }),
        );

        await act(async () => {
            const saved = await result.current.addFiles([
                new File(['one'], 'one.csv', { type: 'text/csv' }),
                new File(['two'], 'two.csv', { type: 'text/csv' }),
            ]);

            expect(saved).toEqual([
                { token: 'saved-file' },
                { token: 'saved-file' },
            ]);
        });

        expect(result.current.entries).toHaveLength(2);
        expect(
            new Set(result.current.entries.map((entry) => entry.id)).size,
        ).toBe(2);
        expect(
            result.current.entries.every(
                (entry) => entry.status === 'complete',
            ),
        ).toBe(true);
        expect(onUploaded).toHaveBeenCalledTimes(2);
    });
});
