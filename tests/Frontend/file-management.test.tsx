import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    usePage: () => ({
        props: { auth: { authorization: { permissions: [] } } },
    }),
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string;
        children?: ReactNode;
    }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
    router: { get: vi.fn(), reload: vi.fn() },
}));

import { FileDropzone } from '@/components/file-dropzone';
import {
    FileThumbnail,
    fileKind,
    formatFileSize,
} from '@/features/files/file-display';
import { FilesList } from '@/features/files/components/files-list';
import FileShow from '@/pages/files/show';
import type { FileDto, FilePagination } from '@/types';

const file: FileDto = {
    token: 'opaque-file-token',
    name: 'report.xlsx',
    mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
    sizeBytes: 2048,
    width: null,
    height: null,
    module: 'files',
    tag: 'report',
    recordStatus: 1,
    createdAt: '2026-09-27T12:00:00Z',
    contentUrl: '/files/opaque-file-token/content',
    thumbnailUrl: null,
    downloadUrl: '/files/opaque-file-token/download',
    previewDataUrl: '/files/opaque-file-token/preview-data',
    recordStatusUrl: '/files/opaque-file-token/record-status',
    assigned: false,
};

describe('file display', () => {
    it('shows spreadsheet icons and readable metadata without inventing image dimensions', () => {
        expect(fileKind(file)).toBe('table');
        expect(formatFileSize(file.sizeBytes)).toBe('2.0 KB');
        const { container } = render(<FileThumbnail file={file} />);
        expect(container.querySelector('svg')).toBeTruthy();
        expect(container.querySelector('img')).toBeNull();
    });

    it('uses a token thumbnail for images', () => {
        const { container } = render(
            <FileThumbnail
                file={{
                    ...file,
                    name: 'photo.png',
                    mimeType: 'image/png',
                    extension: 'png',
                    thumbnailUrl: '/files/image-token/thumbnail',
                }}
            />,
        );
        expect(container.querySelector('img')).toHaveAttribute(
            'src',
            '/files/image-token/thumbnail',
        );
    });
});

describe('FileDropzone', () => {
    it('accepts keyboard activation and reports selected files', async () => {
        const user = userEvent.setup();
        const onFiles = vi.fn();
        render(
            <FileDropzone
                label="Choose files"
                hint="CSV only"
                accept="text/csv"
                entries={[]}
                error={null}
                onFiles={onFiles}
                onRetry={vi.fn()}
                onRemove={vi.fn()}
            />,
        );
        await user.upload(
            screen.getByLabelText('Choose files', { selector: 'input' }),
            new File(['a,b'], 'report.csv', { type: 'text/csv' }),
        );
        expect(onFiles).toHaveBeenCalledTimes(1);
        expect(onFiles.mock.calls[0][0][0].name).toBe('report.csv');
    });

    it('shows progress, retry, removal and a validation error accessibly', () => {
        const onRetry = vi.fn();
        const onRemove = vi.fn();
        const entry = {
            id: 'one',
            file: new File(['bad'], 'bad.csv'),
            progress: 40,
            status: 'failed' as const,
            error: 'Upload failed',
            result: null,
        };
        render(
            <FileDropzone
                label="Choose files"
                hint="CSV only"
                entries={[entry]}
                error="Choose a smaller file"
                onFiles={vi.fn()}
                onRetry={onRetry}
                onRemove={onRemove}
            />,
        );
        expect(screen.getAllByRole('alert')).toHaveLength(2);
        fireEvent.click(screen.getByRole('button', { name: 'Retry bad.csv' }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove bad.csv' }));
        expect(onRetry).toHaveBeenCalledWith('one');
        expect(onRemove).toHaveBeenCalledWith('one');
    });
});

describe('Files index', () => {
    const pagination: FilePagination = {
        data: [file],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 50,
        from: 1,
        to: 1,
        links: [],
    };

    it('uses the standard padded index layout, data table, filter sheet, and token row link', () => {
        const { container } = render(
            <FilesList
                files={pagination}
                filters={{
                    search: '',
                    record_status: 'active',
                    module: '',
                    per_page: 50,
                }}
                canCreate
                canViewDeleted
                canUpdateDeleted
            />,
        );

        expect(container.querySelector('[data-slot="index-page"]')).toHaveClass(
            'p-4',
            'sm:p-6',
            'lg:p-8',
        );
        expect(
            container.querySelector('[data-slot="data-table"]'),
        ).toBeInTheDocument();
        expect(
            container.querySelector(
                '[data-slot="data-table-scroll-container"]',
            ),
        ).toHaveClass('overflow-x-auto');
        expect(
            screen.getByRole('columnheader', { name: 'Name' }),
        ).toBeVisible();
        expect(
            screen.getByRole('link', { name: 'report.xlsx' }),
        ).toHaveAttribute('href', '/files/opaque-file-token');
        expect(screen.getByRole('button', { name: /Filter/ })).toBeVisible();
        expect(screen.getByRole('button', { name: /columns/i })).toBeVisible();
    });

    it('keeps the standard table shell and a useful empty state when no files match', () => {
        const { container } = render(
            <FilesList
                files={{
                    ...pagination,
                    data: [],
                    total: 0,
                    from: null,
                    to: null,
                }}
                filters={{ search: 'missing' }}
                canCreate={false}
                canViewDeleted={false}
                canUpdateDeleted={false}
            />,
        );

        expect(
            container.querySelector('[data-slot="data-table"]'),
        ).toBeInTheDocument();
        const emptyState = screen.getByRole('status');
        expect(emptyState).toHaveTextContent(
            /No files match the current filters/,
        );
        expect(
            emptyState.closest('[data-slot="data-table-scroll-container"]'),
        ).toBeNull();
        expect(screen.queryByText('Add files')).not.toBeInTheDocument();
    });
});

describe('File details', () => {
    it('uses the shared details page and view with preview, metadata, and status', () => {
        const { container } = render(
            <FileShow
                file={{
                    ...file,
                    name: 'archive.zip',
                    mimeType: 'application/zip',
                    extension: 'zip',
                    previewDataUrl: null,
                }}
                canViewDeleted={false}
                canUpdateDeleted={false}
            />,
        );

        expect(
            container.querySelector('[data-slot="details-page"]'),
        ).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
        expect(
            container.querySelector('[data-slot="details-view"]'),
        ).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Preview' })).toBeVisible();
        expect(
            screen.getByRole('heading', { name: 'File details' }),
        ).toBeVisible();
        expect(screen.getByText('2.0 KB')).toBeVisible();
        expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
            'href',
            '/files/opaque-file-token/download',
        );
    });
});
