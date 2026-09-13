import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaAssetDto } from '@/types';

vi.mock('@/components/ui/confirm-dialog', () => ({
    ConfirmDialog: () => null,
}));

import { ImageGalleryPicker } from '@/components/image-gallery-picker';

const asset: MediaAssetDto = {
    id: 7,
    name: 'operations-logo.png',
    mimeType: 'image/png',
    extension: 'png',
    sizeBytes: 2048,
    width: 400,
    height: 100,
    source: 'upload',
    createdAt: '2026-09-05T08:00:00+08:00',
    contentUrl: '/media-assets/7/content',
    thumbnailUrl: '/media-assets/7/thumbnail',
    assigned: false,
};

describe('ImageGalleryPicker', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [asset],
                meta: { current_page: 1, last_page: 1, total: 1 },
            }),
        }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('loads the owned library and confirms a controlled selection', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const onConfirm = vi.fn();

        render(
            <ImageGalleryPicker
                open
                onOpenChange={() => undefined}
                value={null}
                onChange={onChange}
                onConfirm={onConfirm}
            />,
        );

        await user.click(await screen.findByRole('button', { name: /operations-logo\.png/i }));
        expect(onChange).toHaveBeenCalledWith(asset);
        await user.click(screen.getByRole('button', { name: 'Use selected image' }));
        expect(onConfirm).toHaveBeenCalledWith(asset);
    });

    it('searches with a bounded media request', async () => {
        const user = userEvent.setup();
        render(
            <ImageGalleryPicker
                open
                onOpenChange={() => undefined}
                value={null}
                onChange={() => undefined}
                onConfirm={() => undefined}
            />,
        );

        const input = await screen.findByLabelText('Search your uploads');
        await user.type(input, 'logo');
        await user.keyboard('{Enter}');

        await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(
            '/media-assets?page=1&search=logo',
            expect.objectContaining({ credentials: 'same-origin' }),
        ));
    });

    it('stops every camera track when the picker unmounts', async () => {
        const user = userEvent.setup();
        const stop = vi.fn();
        const stream = {
            getTracks: () => [{ stop }],
        } as unknown as MediaStream;
        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia: vi.fn().mockResolvedValue(stream),
                enumerateDevices: vi.fn().mockResolvedValue([]),
            },
        });
        vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();

        const { unmount } = render(
            <ImageGalleryPicker
                open
                onOpenChange={() => undefined}
                value={null}
                onChange={() => undefined}
                onConfirm={() => undefined}
            />,
        );

        await user.click(await screen.findByRole('tab', { name: 'Camera' }));
        await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());
        unmount();
        expect(stop).toHaveBeenCalled();
    });
});
