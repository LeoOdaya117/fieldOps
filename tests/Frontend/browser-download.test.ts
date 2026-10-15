import { describe, expect, it, vi } from 'vitest';
import { startBrowserDownload } from '@/features/exports/lib/browser-download';

describe('browser export downloads', () => {
    it('navigates to the protected attachment URL', () => {
        const navigate = vi.fn();

        startBrowserDownload('/exports/artifacts/123/download', navigate);

        expect(navigate).toHaveBeenCalledOnce();
        expect(navigate).toHaveBeenCalledWith(
            '/exports/artifacts/123/download',
        );
    });
});
