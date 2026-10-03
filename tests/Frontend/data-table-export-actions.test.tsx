import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExportResult } from '@/features/exports/types';

type VisitOptions = {
    onStart?: () => void;
    onSuccess?: (page: {
        props: { flash?: { exportResult?: ExportResult | null } };
    }) => void;
    onError?: (errors: Record<string, string>) => void;
    onFinish?: () => void;
};

const state = vi.hoisted(() => ({
    permissions: [] as string[],
    post: vi.fn(),
    download: vi.fn(),
    toast: {
        loading: vi.fn(() => 'export-toast'),
        success: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        dismiss: vi.fn(),
    },
}));

vi.mock('@inertiajs/react', () => ({
    router: { post: state.post },
    usePage: () => ({
        props: {
            auth: {
                authorization: {
                    permissions: state.permissions,
                },
            },
        },
    }),
}));

vi.mock('@/routes/exports', () => ({
    store: {
        url: ({ dataset, format }: { dataset: string; format: string }) =>
            `/exports/${dataset}/${format}`,
    },
}));

vi.mock('@/features/exports/lib/browser-download', () => ({
    startBrowserDownload: state.download,
}));

vi.mock('sonner', () => ({ toast: state.toast }));

import { DataTableExportActions } from '@/features/exports/components/data-table-export-actions';
import type { DataTableExportOptions } from '@/features/exports/types';

const userExportOptions: DataTableExportOptions = {
    dataset: 'users',
    permissionNamespaces: ['users'],
    filters: {
        search: 'Ria',
        status: ['active', 'suspended'],
        record_status: 'active',
        sort: 'name',
        direction: 'asc',
        page: 4,
        per_page: 50,
    },
};

const invitationExportOptions: DataTableExportOptions = {
    dataset: 'invitations',
    permissionNamespaces: ['users'],
    requiredPermissions: ['users.view'],
    filters: {
        record_status: ['active', 'inactive'],
        invitation_sort: 'email',
        invitation_direction: 'asc',
    },
};

const fileExportOptions: DataTableExportOptions = {
    dataset: 'files',
    permissionNamespaces: ['files', 'media_assets', 'users'],
    permissionScopes: [
        {
            module: 'files',
            namespace: 'files',
            viewPermissions: ['files.view'],
            deletedPermission: 'files.view_deleted',
        },
        {
            module: 'gallery',
            namespace: 'media_assets',
            viewPermissions: ['media_assets.view'],
            deletedPermission: 'media_assets.view_deleted',
        },
        {
            module: 'avatars',
            namespace: 'users',
            viewPermissions: ['users.view', 'files.view'],
            deletedPermission: 'users.view_deleted',
        },
    ],
    filters: {},
};

function mockReadyExport(result: ExportResult, requestStarted = true) {
    state.post.mockImplementation(
        (_url: string, _data: unknown, options: VisitOptions) => {
            if (requestStarted) {
                options.onStart?.();
            }

            options.onSuccess?.({ props: { flash: { exportResult: result } } });
            options.onFinish?.();
        },
    );
}

describe('data table export actions', () => {
    beforeEach(() => {
        state.permissions = [];
        state.post.mockReset();
        state.download.mockReset();
        state.toast.loading.mockReset().mockReturnValue('export-toast');
        state.toast.success.mockReset();
        state.toast.info.mockReset();
        state.toast.error.mockReset();
        state.toast.dismiss.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows only the formats granted by the current role', async () => {
        state.permissions = ['users.export_pdf', 'users.export_csv'];
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        const trigger = screen.getByRole('button', { name: 'Export options' });
        expect(trigger).toHaveClass('focus-visible:ring-[3px]');
        await user.click(trigger);

        const menu = screen.getByRole('menu');
        expect(
            within(menu).getByRole('menuitem', { name: 'PDF' }),
        ).toBeVisible();
        expect(
            within(menu).getByRole('menuitem', { name: 'CSV' }),
        ).toBeVisible();
        expect(
            within(menu).queryByRole('menuitem', { name: 'Excel (.xlsx)' }),
        ).not.toBeInTheDocument();
        expect(
            within(menu).queryByRole('menuitem', { name: 'Print' }),
        ).not.toBeInTheDocument();
    });

    it('omits the dropdown when the role has no export permission', () => {
        render(<DataTableExportActions options={userExportOptions} />);

        expect(
            screen.queryByRole('button', { name: 'Export options' }),
        ).not.toBeInTheDocument();
    });

    it('hides file formats when the role has an export grant without module view access', () => {
        state.permissions = ['media_assets.export_xlsx'];

        render(<DataTableExportActions options={fileExportOptions} />);

        expect(
            screen.queryByRole('button', { name: 'Export options' }),
        ).not.toBeInTheDocument();
    });

    it('shows formats from modules where the role has both view and export access', async () => {
        state.permissions = ['media_assets.view', 'media_assets.export_xlsx'];
        const user = userEvent.setup();

        render(<DataTableExportActions options={fileExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );

        expect(
            screen.getByRole('menuitem', { name: 'Excel (.xlsx)' }),
        ).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'PDF' })).toBeNull();
    });

    it('limits Files menu formats to the selected module', () => {
        state.permissions = ['files.view', 'files.export_pdf'];

        render(
            <DataTableExportActions
                options={{
                    ...fileExportOptions,
                    filters: { module: 'gallery' },
                }}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Export options' }),
        ).not.toBeInTheDocument();
    });

    it('allows owner-scoped avatar exports through Files access', async () => {
        state.permissions = ['files.view', 'users.export_xlsx'];
        const user = userEvent.setup();

        render(
            <DataTableExportActions
                options={{
                    ...fileExportOptions,
                    filters: { module: 'avatars' },
                }}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );

        expect(
            screen.getByRole('menuitem', { name: 'Excel (.xlsx)' }),
        ).toBeVisible();
        expect(screen.queryByRole('menuitem', { name: 'PDF' })).toBeNull();
    });

    it('requires the module deleted-view grant for inactive Files exports', () => {
        state.permissions = ['users.view', 'users.export_csv'];
        const { rerender } = render(
            <DataTableExportActions
                options={{
                    ...fileExportOptions,
                    filters: { module: 'avatars', record_status: 'inactive' },
                }}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Export options' }),
        ).not.toBeInTheDocument();

        state.permissions.push('users.view_deleted');
        rerender(
            <DataTableExportActions
                options={{
                    ...fileExportOptions,
                    filters: { module: 'avatars', record_status: 'inactive' },
                }}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Export options' }),
        ).toBeVisible();
    });

    it('requires users.view in addition to the format permission for invitations', async () => {
        state.permissions = ['users.export_csv'];
        const { rerender } = render(
            <DataTableExportActions options={invitationExportOptions} />,
        );

        expect(
            screen.queryByRole('button', { name: 'Export options' }),
        ).not.toBeInTheDocument();

        state.permissions = ['users.view'];
        rerender(<DataTableExportActions options={invitationExportOptions} />);
        expect(
            screen.queryByRole('button', { name: 'Export options' }),
        ).not.toBeInTheDocument();

        state.permissions.push('users.export_csv');
        rerender(<DataTableExportActions options={invitationExportOptions} />);
        const user = userEvent.setup();
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );

        expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeVisible();
    });

    it('requires review permission in addition to the registrations export grant', async () => {
        state.permissions = ['users.export_csv'];
        const user = userEvent.setup();

        const { rerender } = render(
            <DataTableExportActions
                options={{
                    dataset: 'registrations',
                    permissionNamespaces: ['users'],
                    requiredPermissions: ['users.review_registrations'],
                    filters: {},
                }}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Export options' }),
        ).not.toBeInTheDocument();

        state.permissions.push('users.review_registrations');
        rerender(
            <DataTableExportActions
                options={{
                    dataset: 'registrations',
                    permissionNamespaces: ['users'],
                    requiredPermissions: ['users.review_registrations'],
                    filters: {},
                }}
            />,
        );
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );
        expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeVisible();
    });

    it('posts active filter and sort values while excluding pagination', async () => {
        state.permissions = ['users.export_csv'];
        state.post.mockImplementation(
            (_url: string, _data: unknown, options: VisitOptions) => {
                options.onStart?.();
            },
        );
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'CSV' }));

        expect(state.post).toHaveBeenCalledWith(
            '/exports/users/csv',
            {
                filters: {
                    search: 'Ria',
                    status: ['active', 'suspended'],
                    record_status: 'active',
                    sort: 'name',
                    direction: 'asc',
                },
            },
            expect.objectContaining({
                onStart: expect.any(Function),
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            }),
        );
        expect(state.toast.loading).toHaveBeenCalledWith(
            'Preparing CSV export…',
        );
    });

    it('includes invitation record status and sort state in the export request', async () => {
        state.permissions = ['users.export_csv', 'users.view'];
        state.post.mockImplementation(
            (_url: string, _data: unknown, options: VisitOptions) => {
                options.onStart?.();
            },
        );
        const user = userEvent.setup();

        render(<DataTableExportActions options={invitationExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'CSV' }));

        expect(state.post).toHaveBeenCalledWith(
            '/exports/invitations/csv',
            {
                filters: {
                    record_status: ['active', 'inactive'],
                    invitation_sort: 'email',
                    invitation_direction: 'asc',
                },
            },
            expect.any(Object),
        );
    });

    it('submits exports from the keyboard menu flow', async () => {
        state.permissions = ['users.export_csv'];
        state.post.mockImplementation(
            (_url: string, _data: unknown, options: VisitOptions) => {
                options.onStart?.();
            },
        );
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        await user.tab();
        expect(
            screen.getByRole('button', { name: 'Export options' }),
        ).toHaveFocus();
        await user.keyboard('{Enter}{Enter}');

        expect(state.post).toHaveBeenCalledWith(
            '/exports/users/csv',
            expect.any(Object),
            expect.any(Object),
        );
        expect(state.toast.loading).toHaveBeenCalledWith(
            'Preparing CSV export…',
        );
    });

    it.each([
        {
            format: 'pdf',
            permission: 'users.export_pdf',
            label: 'PDF',
        },
        {
            format: 'csv',
            permission: 'users.export_csv',
            label: 'CSV',
        },
        {
            format: 'xlsx',
            permission: 'users.export_xlsx',
            label: 'Excel (.xlsx)',
        },
    ])(
        'automatically downloads a ready $label export',
        async ({ format, permission, label }) => {
            const downloadUrl = `/exports/artifacts/${format}/download`;
            state.permissions = [permission];
            mockReadyExport({
                status: 'ready',
                message: `Your ${label} export is ready.`,
                downloadUrl,
            });
            const user = userEvent.setup();

            render(<DataTableExportActions options={userExportOptions} />);
            await user.click(
                screen.getByRole('button', { name: 'Export options' }),
            );
            await user.click(screen.getByRole('menuitem', { name: label }));

            expect(state.download).toHaveBeenCalledTimes(1);
            expect(state.download).toHaveBeenCalledWith(downloadUrl);
            expect(state.toast.success).toHaveBeenCalledWith(
                `Your ${label} export is ready.`,
                { id: 'export-toast' },
            );
            expect(
                screen.queryByText(`Your ${label} export is ready.`),
            ).not.toBeInTheDocument();
        },
    );

    it('reports a missing file download URL after a ready response', async () => {
        state.permissions = ['users.export_csv'];
        mockReadyExport({
            status: 'ready',
            message: 'Your export is ready.',
        });
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'CSV' }));

        expect(state.toast.error).toHaveBeenCalledWith(
            'The export is ready, but no download URL was provided.',
            { id: 'export-toast' },
        );
        expect(state.download).not.toHaveBeenCalled();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('reports queued exports without offering an unfinished download', async () => {
        state.permissions = ['users.export_xlsx'];
        mockReadyExport({
            status: 'queued',
            message:
                'Your export is queued. We will notify you when it is ready.',
        });
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );
        await user.click(
            screen.getByRole('menuitem', { name: 'Excel (.xlsx)' }),
        );

        expect(state.toast.info).toHaveBeenCalledWith(
            'Your export is queued. We will notify you when it is ready.',
            { id: 'export-toast' },
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows a safe actionable message when the export request fails', async () => {
        state.permissions = ['users.export_csv'];
        state.post.mockImplementation(
            (_url: string, _data: unknown, options: VisitOptions) => {
                options.onStart?.();
                options.onError?.({ filters: 'Narrow the filters and retry.' });
                options.onFinish?.();
            },
        );
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'CSV' }));

        expect(state.toast.error).toHaveBeenCalledWith(
            'Narrow the filters and retry.',
            { id: 'export-toast' },
        );
    });

    it('opens a ready print view in the popup created by the user action', async () => {
        state.permissions = ['users.export_print'];
        const location = { replace: vi.fn() };
        const printWindow = {
            opener: window,
            document: { title: '', body: { textContent: '' } },
            location,
            close: vi.fn(),
        };
        vi.spyOn(window, 'open').mockReturnValue(
            printWindow as unknown as Window,
        );
        mockReadyExport(
            {
                status: 'ready',
                message: 'Your print view is ready.',
                downloadUrl: '/exports/artifacts/print/download',
                printUrl: '/exports/artifacts/print/view',
            },
            true,
        );
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Print' }));

        expect(window.open).toHaveBeenCalledWith(
            'about:blank',
            'fieldops-print-export',
            'popup=yes,width=1100,height=750,resizable=yes,scrollbars=yes',
        );
        expect(location.replace).toHaveBeenCalledWith(
            '/exports/artifacts/print/view',
        );
        expect(state.toast.success).toHaveBeenCalledWith(
            'Your print view is ready.',
            { id: 'export-toast' },
        );
    });

    it('offers an open print view action in the toast when the popup is blocked', async () => {
        state.permissions = ['users.export_print'];
        vi.spyOn(window, 'open').mockReturnValue(null);
        mockReadyExport({
            status: 'ready',
            message: 'Your print view is ready.',
            printUrl: '/exports/artifacts/print/view',
        });
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );
        await user.click(screen.getByRole('menuitem', { name: 'Print' }));

        expect(state.toast.info).toHaveBeenCalledWith(
            'Your print view is ready.',
            expect.objectContaining({
                id: 'export-toast',
                action: expect.objectContaining({
                    label: 'Open print view',
                    onClick: expect.any(Function),
                }),
            }),
        );
        const toastOptions = state.toast.info.mock.calls[0]?.[1] as
            | {
                  action?: {
                      label: string;
                      onClick: () => void;
                  };
              }
            | undefined;
        toastOptions?.action?.onClick();
        expect(window.open).toHaveBeenNthCalledWith(
            2,
            '/exports/artifacts/print/view',
            'fieldops-print-export',
            'popup=yes,width=1100,height=750,resizable=yes,scrollbars=yes',
        );
    });

    it('uses theme tokens and a viewport-bounded menu width for responsive layouts', async () => {
        state.permissions = ['users.export_csv'];
        const user = userEvent.setup();

        render(<DataTableExportActions options={userExportOptions} />);
        await user.click(
            screen.getByRole('button', { name: 'Export options' }),
        );

        const menu = screen.getByRole('menu');
        expect(menu).toHaveClass(
            'bg-popover',
            'text-popover-foreground',
            'w-[min(18rem,calc(100vw-2rem))]',
        );
    });
});
