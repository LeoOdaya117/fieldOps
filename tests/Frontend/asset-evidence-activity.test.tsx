import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    delete: vi.fn(),
    reload: vi.fn(),
    post: vi.fn(),
    formErrors: {} as Record<string, string>,
    processing: false,
    progress: null as { percentage: number } | null,
}));

vi.mock('@inertiajs/react', async () => {
    const { useState } = await import('react');

    return {
        Link: ({ children, href, ...props }: ComponentProps<'a'>) => (
            <a href={href} {...props}>
                {children}
            </a>
        ),
        router: { delete: mocks.delete, reload: mocks.reload },
        useForm: (initial: { file: File | null }) => {
            const [data, setData] = useState(initial);

            return {
                data,
                errors: mocks.formErrors,
                processing: mocks.processing,
                progress: mocks.progress,
                setData: (key: 'file', value: File | null) =>
                    setData((current) => ({ ...current, [key]: value })),
                post: (url: string, options: { onSuccess: () => void }) => {
                    mocks.post(url, options);
                    options.onSuccess();
                },
                reset: () => setData(initial),
            };
        },
    };
});

import { AssetEvidenceActivity } from '@/features/assets/components/asset-evidence-activity';
import type {
    AssetActivityPage,
    AssetEvidence,
    AssetHistoryEvent,
} from '@/features/assets/types';

const evidence: AssetActivityPage<AssetEvidence> = {
    data: [
        {
            id: 7,
            name: 'pump-photo.png',
            mimeType: 'image/png',
            sizeBytes: 1024,
            createdAt: '2026-10-30T05:00:00Z',
            actorName: 'Ari Example',
            contentUrl: '/assets/8/evidence/7/content',
            downloadUrl: '/assets/8/evidence/7/download',
            thumbnailUrl: '/assets/8/evidence/7/thumbnail',
            previewDataUrl: null,
            removeUrl: '/assets/8/evidence/7',
        },
    ],
    current_page: 1,
    last_page: 1,
    links: [],
};

const history: AssetActivityPage<AssetHistoryEvent> = {
    data: [
        {
            id: 12,
            event: 'asset.updated',
            occurredAt: '2026-10-30T05:10:00Z',
            actorName: 'Ari Example',
            changes: {
                before: { condition: 'Operational' },
                after: { condition: 'Needs maintenance' },
            },
        },
    ],
    current_page: 1,
    last_page: 1,
    links: [],
};

describe('asset evidence and activity', () => {
    beforeEach(() => {
        mocks.delete.mockReset();
        mocks.reload.mockReset();
        mocks.post.mockReset();
        mocks.formErrors = {};
        mocks.processing = false;
        mocks.progress = null;
        vi.unstubAllGlobals();
    });

    it('shows private evidence previews, downloads, and safe change history', () => {
        render(
            <AssetEvidenceActivity
                evidence={evidence}
                history={history}
                canManageEvidence={false}
                storeUrl="/assets/8/evidence"
            />,
        );

        expect(
            screen.getByRole('link', { name: 'Preview pump-photo.png' }),
        ).toHaveAttribute('href', evidence.data[0].contentUrl);
        expect(screen.getByRole('link', { name: /Download/ })).toHaveAttribute(
            'href',
            evidence.data[0].downloadUrl,
        );
        expect(screen.getAllByText(/Ari Example/)).toHaveLength(2);
        expect(
            screen.getByText(/Condition: Operational → Needs maintenance/i),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Remove pump-photo.png' }),
        ).not.toBeInTheDocument();
    });

    it('lets an authorized manager upload and remove an attachment', async () => {
        const user = userEvent.setup();
        render(
            <AssetEvidenceActivity
                evidence={evidence}
                history={history}
                canManageEvidence
                storeUrl="/assets/8/evidence"
            />,
        );

        await user.upload(
            screen.getByLabelText('Add evidence files'),
            new File(['inspection'], 'inspection.txt', { type: 'text/plain' }),
        );
        screen.getByRole('button', { name: 'Upload' }).focus();
        await user.keyboard('{Enter}');
        expect(mocks.post).toHaveBeenCalledWith(
            '/assets/8/evidence',
            expect.objectContaining({ forceFormData: true }),
        );
        expect(mocks.reload).toHaveBeenCalledWith({
            only: ['evidence', 'history'],
        });

        await user.click(
            screen.getByRole('button', { name: 'Remove pump-photo.png' }),
        );
        expect(mocks.delete).toHaveBeenCalledWith(
            evidence.data[0].removeUrl,
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('renders accessible empty and upload-error states', () => {
        mocks.formErrors = { file: 'Choose an accepted file type.' };
        render(
            <AssetEvidenceActivity
                evidence={{ ...evidence, data: [] }}
                history={{ ...history, data: [] }}
                canManageEvidence
                storeUrl="/assets/8/evidence"
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Choose an accepted file type.',
        );
        expect(
            screen.getByText('No evidence files have been added.'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('No activity has been recorded yet.'),
        ).toBeInTheDocument();
    });

    it('offers bounded paginator links for later evidence and history pages', () => {
        render(
            <AssetEvidenceActivity
                evidence={{
                    ...evidence,
                    last_page: 2,
                    links: [
                        { url: null, label: 'Previous', active: false },
                        {
                            url: '/assets/8?page=2',
                            label: 'Next',
                            active: false,
                        },
                    ],
                }}
                history={{
                    ...history,
                    last_page: 2,
                    links: [
                        { url: null, label: 'Previous', active: false },
                        {
                            url: '/assets/8?page=3',
                            label: 'Next',
                            active: false,
                        },
                    ],
                }}
                canManageEvidence={false}
                storeUrl="/assets/8/evidence"
            />,
        );

        expect(screen.getAllByRole('link', { name: 'Next' })).toHaveLength(2);
        expect(
            screen.getAllByRole('link', { name: 'Next' })[0],
        ).toHaveAttribute('href', '/assets/8?page=2');
        expect(
            screen.getAllByRole('link', { name: 'Next' })[1],
        ).toHaveAttribute('href', '/assets/8?page=3');
    });

    it('loads and safely renders bounded CSV preview rows', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    rows: [
                        ['item', 'result'],
                        ['pump', '<checked>'],
                    ],
                }),
            }),
        );
        const csv = {
            ...evidence.data[0],
            name: 'inspection.csv',
            mimeType: 'text/csv',
            previewDataUrl: '/assets/8/evidence/token/preview-data',
        };

        render(
            <AssetEvidenceActivity
                evidence={{ ...evidence, data: [csv] }}
                history={history}
                canManageEvidence={false}
                storeUrl="/assets/8/evidence"
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Preview rows' }));

        const region = await screen.findByRole('region', {
            name: 'First rows of evidence',
        });
        expect(region).toHaveTextContent('pump');
        expect(region).toHaveTextContent('<checked>');
        expect(region.querySelector('script')).toBeNull();
    });

    it('shows an accessible loading state while evidence preview is pending', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn(() => new Promise(() => {})),
        );
        const csv = {
            ...evidence.data[0],
            name: 'inspection.csv',
            mimeType: 'text/csv',
            previewDataUrl: '/assets/8/evidence/token/preview-data',
        };

        render(
            <AssetEvidenceActivity
                evidence={{ ...evidence, data: [csv] }}
                history={history}
                canManageEvidence={false}
                storeUrl="/assets/8/evidence"
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Preview rows' }));

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Loading preview',
        );
    });

    it('shows preview errors and empty results without hiding the download path', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                json: async () => ({
                    message: 'Preview is temporarily unavailable.',
                }),
            }),
        );
        const csv = {
            ...evidence.data[0],
            name: 'inspection.csv',
            mimeType: 'text/csv',
            previewDataUrl: '/assets/8/evidence/token/preview-data',
        };

        render(
            <AssetEvidenceActivity
                evidence={{ ...evidence, data: [csv] }}
                history={history}
                canManageEvidence={false}
                storeUrl="/assets/8/evidence"
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Preview rows' }));

        expect(await screen.findByRole('status')).toHaveTextContent(
            'Preview is temporarily unavailable. You can still download this evidence.',
        );
        expect(
            screen.getByRole('link', { name: /Download/ }),
        ).toBeInTheDocument();
    });

    it('shows a quiet empty state for evidence without table rows', async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ rows: [] }),
            }),
        );
        const csv = {
            ...evidence.data[0],
            name: 'empty.csv',
            mimeType: 'text/csv',
            previewDataUrl: '/assets/8/evidence/token/preview-data',
        };

        render(
            <AssetEvidenceActivity
                evidence={{ ...evidence, data: [csv] }}
                history={history}
                canManageEvidence={false}
                storeUrl="/assets/8/evidence"
            />,
        );
        await user.click(screen.getByRole('button', { name: 'Preview rows' }));

        expect(await screen.findByRole('status')).toHaveTextContent(
            'This file has no rows to preview.',
        );
    });

    it('exposes Inertia upload progress accessibly', () => {
        mocks.processing = true;
        mocks.progress = { percentage: 42 };
        render(
            <AssetEvidenceActivity
                evidence={evidence}
                history={history}
                canManageEvidence
                storeUrl="/assets/8/evidence"
            />,
        );

        expect(
            screen.getByRole('progressbar', {
                name: 'Evidence upload progress',
            }),
        ).toHaveAttribute('value', '42');
    });
});
