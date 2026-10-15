import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaAssetDto } from '@/types';

vi.mock('@/components/ui/confirm-dialog', () => ({
    ConfirmDialog: () => null,
}));

import { ImageGalleryPicker } from '@/components/image-gallery-picker';

const asset: MediaAssetDto = {
    token: 'opaque-gallery-token',
    name: 'operations-logo.png',
    mimeType: 'image/png',
    extension: 'png',
    module: 'gallery',
    tag: null,
    sizeBytes: 2048,
    width: 400,
    height: 100,
    source: 'upload',
    createdAt: '2026-09-05T08:00:00+08:00',
    contentUrl: '/files/opaque-gallery-token/content',
    thumbnailUrl: '/files/opaque-gallery-token/thumbnail',
    downloadUrl: '/files/opaque-gallery-token/download',
    previewDataUrl: '/files/opaque-gallery-token/preview-data',
    assigned: false,
    recordStatus: 1,
    recordStatusUrl: '/files/opaque-gallery-token/record-status',
    updateUrl: '/media-assets/opaque-gallery-token',
};

describe('ImageGalleryPicker', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockImplementation((request: RequestInfo | URL) => {
                const inactive = String(request).includes(
                    'record_status=inactive',
                );

                return Promise.resolve({
                    ok: true,
                    json: async () => ({
                        data: [
                            inactive ? { ...asset, recordStatus: 0 } : asset,
                        ],
                        meta: { current_page: 1, last_page: 1, total: 1 },
                        canCreate: true,
                        canUpdate: true,
                        canDelete: true,
                        canViewDeleted: true,
                        canUpdateDeleted: true,
                    }),
                });
            }),
        );
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

        await user.click(
            await screen.findByRole('button', {
                name: /operations-logo\.png/i,
            }),
        );
        expect(onChange).toHaveBeenCalledWith(asset);
        await user.click(
            screen.getByRole('button', { name: 'Use selected image' }),
        );
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

        await waitFor(() =>
            expect(fetch).toHaveBeenLastCalledWith(
                '/media-assets?page=1&search=logo',
                expect.objectContaining({ credentials: 'same-origin' }),
            ),
        );
    });

    it('filters inactive media and prevents assigning it until restored', async () => {
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

        await user.click(
            await screen.findByRole('button', { name: 'Inactive' }),
        );
        await waitFor(() =>
            expect(fetch).toHaveBeenLastCalledWith(
                '/media-assets?page=1&record_status=inactive',
                expect.anything(),
            ),
        );
        await user.click(
            await screen.findByRole('button', {
                name: /operations-logo\.png/i,
            }),
        );
        expect(
            screen.getByRole('button', { name: 'Restore image to assign it' }),
        ).toBeDisabled();
        expect(
            screen.queryByRole('button', { name: 'Rename' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Delete image' }),
        ).not.toBeInTheDocument();
    });

    it('hides mutation tabs and lifecycle controls when capabilities are absent', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    data: [asset],
                    meta: { current_page: 1, last_page: 1, total: 1 },
                    canCreate: false,
                    canUpdate: false,
                    canDelete: false,
                    canViewDeleted: false,
                    canUpdateDeleted: false,
                }),
            }),
        );
        render(
            <ImageGalleryPicker
                open
                onOpenChange={() => undefined}
                value={null}
                onChange={() => undefined}
                onConfirm={() => undefined}
            />,
        );
        expect(
            await screen.findByRole('tab', { name: 'My uploads' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('tab', { name: 'Upload' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('tab', { name: 'Camera' }),
        ).not.toBeInTheDocument();
        await userEvent.setup().click(
            await screen.findByRole('button', {
                name: /operations-logo\.png/i,
            }),
        );
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Rename' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Delete image' }),
        ).not.toBeInTheDocument();
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
        await waitFor(() =>
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled(),
        );
        unmount();
        expect(stop).toHaveBeenCalled();
    });
});
