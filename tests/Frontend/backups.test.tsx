import { useState } from 'react';
import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
    Backup,
    BackupAuditEvent,
    BackupCommonProps,
    PaginatedBackups,
} from '@/features/backups/types';

const mocks = vi.hoisted(() => ({
    post: vi.fn(),
    delete: vi.fn(),
    reload: vi.fn(),
}));
vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({
        href,
        ...props
    }: Omit<ComponentProps<'a'>, 'href'> & {
        href: string | { url: string };
    }) => <a href={typeof href === 'string' ? href : href.url} {...props} />,
    usePage: () => ({
        props: {
            auth: { authorization: { permissions: [], isSuperAdmin: true } },
        },
    }),
    router: { reload: mocks.reload, get: vi.fn() },
    useForm: <T extends Record<string, unknown>>(initial: T) => {
        const [data, setData] = useState(initial);
        const [errors, setErrors] = useState<Record<string, string>>({});

        return {
            data,
            errors,
            processing: false,
            progress: null,
            setData: (field: keyof T, value: T[keyof T]) =>
                setData((previous) => ({ ...previous, [field]: value })),
            setError: (field: string, value: string) =>
                setErrors((previous) => ({ ...previous, [field]: value })),
            clearErrors: () => setErrors({}),
            reset: () => setData(initial),
            post: (url: string, options: unknown) =>
                mocks.post(url, data, options),
            delete: mocks.delete,
        };
    },
}));

import Backups from '@/pages/backups/index';
import CreateBackup from '@/pages/backups/create';
import ShowBackup from '@/pages/backups/show';
import BackupAuditPage from '@/pages/backups/audit';
import { selectedTableClosure } from '@/features/backups/types';

const backup: Backup = {
    id: 'backup-a',
    created_at: '2026-10-04T01:00:00Z',
    size_bytes: 1024,
    engine: 'mysql',
    server_version: '8.4.0',
    kind: 'manual',
    scope: 'tables',
    requested_tables: ['orders'],
    tables: ['customers', 'orders'],
    created_by: { id: '7', name: 'Original Creator', source: 'web' },
    stored_by: { id: '8', name: 'Local Uploader', source: 'web' },
    stored_at: '2026-10-04T02:00:00Z',
    audit_note: 'Before deployment',
};
const common: BackupCommonProps = {
    operations: [],
    prerequisites: [
        {
            label: 'Database client',
            ready: true,
            message: 'Native client available.',
        },
    ],
    databaseName: 'fieldops',
    busy: false,
    maxUploadBytes: 512 * 1024 * 1024,
};
const catalog = [
    { name: 'orders', related_tables: ['customers'] },
    { name: 'customers', related_tables: ['orders'] },
    { name: 'countries', related_tables: [] },
];
function paginated<T>(items: T[]): PaginatedBackups<T> {
    return {
        data: items,
        current_page: 1,
        last_page: 1,
        total: items.length,
        from: items.length ? 1 : null,
        to: items.length || null,
        per_page: 15,
        links: [],
    };
}
function inventory(extra: Partial<Parameters<typeof Backups>[0]> = {}) {
    return (
        <Backups
            {...common}
            backups={paginated([backup])}
            filters={{}}
            {...extra}
        />
    );
}
const event: BackupAuditEvent = {
    id: 'event-a',
    event: 'backup.uploaded',
    created_at: '2026-10-04T02:00:00Z',
    actor: backup.stored_by,
    backup_id: backup.id,
    operation_id: null,
    scope: 'tables',
    tables: backup.tables,
    requested_tables: backup.requested_tables,
    audit_note: 'Imported for recovery',
    source_created_by: backup.created_by,
    source_created_at: backup.created_at,
    source_audit_note: backup.audit_note,
    stored_by: backup.stored_by,
    status: 'succeeded',
};

describe('Backup workspace', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.localStorage.clear();
    });
    afterEach(() => {
        vi.useRealTimers();
        document.documentElement.classList.remove('dark');
    });

    it('uses an inventory with creator, scope, size and dedicated workflow links', () => {
        render(inventory());
        expect(
            screen.getByRole('table', { name: 'Saved database backups' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Original Creator')).toBeInTheDocument();
        expect(screen.getByText('Selected tables')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Create backup' }),
        ).toHaveAttribute('href', '/settings/system/backups/create');
        expect(
            screen.getByRole('link', { name: 'Upload package' }),
        ).toHaveAttribute('href', '/settings/system/backups/create');
        expect(
            screen.getByRole('link', { name: 'Backup audit' }),
        ).toHaveAttribute('href', '/settings/system/backups/audit');
        expect(
            screen.getByRole('link', { name: 'View backup backup-a' }),
        ).toHaveAttribute('href', '/settings/system/backups/backup-a');
        expect(
            screen.queryByText('Database client: Ready'),
        ).not.toBeInTheDocument();
    });

    it('preserves active filters and page size when sorting or opening filter controls', async () => {
        render(
            inventory({
                filters: {
                    search: 'orders',
                    actor: 'Creator',
                    scope: 'tables',
                    sort: 'created_at',
                    direction: 'desc',
                    per_page: 25,
                },
            }),
        );
        const href = screen
            .getByRole('link', { name: 'Sort Creator ascending' })
            .getAttribute('href');
        expect(href).toContain('search=orders');
        expect(href).toContain('actor=Creator');
        expect(href).toContain('scope=tables');
        expect(href).toContain('per_page=25');
        expect(href).toContain('sort=actor');
        await userEvent.click(screen.getByRole('button', { name: /Filter/ }));
        const dialog = screen.getByRole('dialog', {
            name: 'Search and filter backups',
        });
        expect(within(dialog).getByLabelText('Search')).toHaveValue('orders');
        expect(within(dialog).getByLabelText('Creator')).toHaveValue('Creator');
        expect(within(dialog).getByLabelText('Search')).toHaveAttribute(
            'maxlength',
            '200',
        );
        expect(
            within(dialog)
                .getByRole('button', { name: 'Apply filters' })
                .closest('form'),
        ).toHaveAttribute('method', 'get');
    });

    it('defaults to full database and sends an optional audit note', async () => {
        render(<CreateBackup {...common} tableCatalog={catalog} />);
        expect(
            screen.getByRole('heading', { name: 'New backup', level: 2 }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('radio', { name: /^Full database/ }),
        ).toBeChecked();
        fireEvent.change(document.getElementById('create-backup-note')!, {
            target: { value: 'Before release' },
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Create backup' }),
        );
        expect(mocks.post).toHaveBeenCalledWith(
            '/settings/system/backups',
            {
                scope: 'database',
                requested_tables: [],
                audit_note: 'Before release',
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    it('previews requested and automatically included related tables and submits only requested names', async () => {
        render(<CreateBackup {...common} tableCatalog={catalog} />);
        await userEvent.click(
            screen.getByRole('radio', { name: /^Selected tables/ }),
        );
        expect(
            screen.getByRole('heading', { name: 'Choose tables', level: 3 }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create backup' }),
        ).toBeDisabled();
        await userEvent.click(screen.getByRole('checkbox', { name: 'orders' }));
        expect(
            screen.getByText('2 tables will be backed up'),
        ).toBeInTheDocument();
        expect(screen.getByText('Requested tables (1)')).toBeInTheDocument();
        expect(
            screen.getByText('Automatically included (1)'),
        ).toBeInTheDocument();
        expect(selectedTableClosure(['orders', 'customers'], catalog)).toEqual([
            'customers',
            'orders',
        ]);
        await userEvent.type(
            screen.getByLabelText('Find a table'),
            'countries',
        );
        expect(
            screen.queryByRole('checkbox', { name: 'orders' }),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('2 tables will be backed up'),
        ).toBeInTheDocument();
        await userEvent.click(
            screen.getByRole('button', { name: 'Create backup' }),
        );
        expect(mocks.post).toHaveBeenCalledWith(
            '/settings/system/backups',
            { scope: 'tables', requested_tables: ['orders'], audit_note: '' },
            expect.any(Object),
        );
    });

    it('validates packages before upload and preserves the uploader note separately', async () => {
        render(
            <CreateBackup
                {...common}
                tableCatalog={catalog}
                maxUploadBytes={10}
            />,
        );
        const input = screen.getByLabelText('Backup package');
        fireEvent.change(input, {
            target: { files: [new File(['sql'], 'unsafe.sql')] },
        });
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Choose a .fieldops or .zip package',
        );
        expect(
            screen.getByRole('button', { name: 'Upload package' }),
        ).toBeDisabled();
        fireEvent.change(input, {
            target: { files: [new File(['12345678901'], 'backup.fieldops')] },
        });
        expect(
            screen.getByRole('button', { name: 'Upload package' }),
        ).toBeDisabled();
        const file = new File(['zip'], 'backup.fieldops', {
            type: 'application/zip',
        });
        fireEvent.change(input, { target: { files: [file] } });
        fireEvent.change(document.getElementById('upload-backup-note')!, {
            target: { value: 'Imported copy' },
        });
        await userEvent.click(
            screen.getByRole('button', { name: 'Upload package' }),
        );
        expect(mocks.post).toHaveBeenCalledWith(
            '/settings/system/backups/upload',
            { package: file, audit_note: 'Imported copy' },
            expect.objectContaining({ forceFormData: true }),
        );
    });

    it('requires typed database confirmation and shows the entire partial restore selection', async () => {
        render(
            <ShowBackup {...common} backup={backup} events={paginated([])} />,
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Restore', exact: true }),
        );
        const dialog = screen.getByRole('dialog', {
            name: 'Restore selected tables?',
        });
        expect(
            within(dialog).getByRole('region', {
                name: 'Restore table selection',
            }),
        ).toHaveTextContent('customers');
        expect(
            within(dialog).getByText(/Runtime sessions, queued jobs/),
        ).toBeInTheDocument();
        const submit = within(dialog).getByRole('button', {
            name: 'Replace selected tables',
        });
        const input = within(dialog).getByLabelText(/Type the database name/);
        await userEvent.type(input, 'fieldops ');
        expect(submit).toBeDisabled();
        await userEvent.clear(input);
        await userEvent.type(input, 'fieldops');
        await userEvent.click(submit);
        expect(mocks.post).toHaveBeenCalledWith(
            '/settings/system/backups/backup-a/restore',
            { database_name: 'fieldops', audit_note: '' },
            expect.any(Object),
        );
    });

    it('shows original creator versus uploader and handles legacy metadata honestly', () => {
        const { rerender } = render(
            <ShowBackup
                {...common}
                backup={{ ...backup, kind: 'uploaded' }}
                events={paginated([])}
            />,
        );
        expect(
            screen.getByRole('heading', {
                name: 'Package information',
                level: 2,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Original creator').nextElementSibling,
        ).toHaveTextContent('Original Creator');
        expect(
            screen.getByText('Uploaded by').nextElementSibling,
        ).toHaveTextContent('Local Uploader');
        expect(
            screen.getByRole('link', { name: 'Open audit history' }),
        ).toHaveAttribute(
            'href',
            '/settings/system/backups/audit?backup=backup-a',
        );
        rerender(
            <ShowBackup
                {...common}
                backup={{
                    ...backup,
                    scope: 'database',
                    created_by: null,
                    tables: null,
                    requested_tables: null,
                }}
                events={paginated([])}
            />,
        );
        expect(
            screen.getByText(/legacy package has no recorded table inventory/),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Original creator').nextElementSibling,
        ).toHaveTextContent('Unknown');
    });

    it('lets keyboard users choose a table and keeps the expanded selection visible', async () => {
        render(<CreateBackup {...common} tableCatalog={catalog} />);
        await userEvent.click(
            screen.getByRole('radio', { name: /^Selected tables/ }),
        );
        const checkbox = screen.getByRole('checkbox', { name: 'orders' });
        checkbox.focus();
        await userEvent.keyboard(' ');
        expect(checkbox).toBeChecked();
        expect(
            screen.getByText('Automatically included (1)'),
        ).toBeInTheDocument();
        await userEvent.keyboard(' ');
        expect(
            screen.getByRole('button', { name: 'Create backup' }),
        ).toBeDisabled();
    });

    it('blocks new work while busy and exposes safe failure and safety backup references', () => {
        render(
            <ShowBackup
                {...common}
                busy
                backup={backup}
                events={paginated([])}
                operations={[
                    {
                        id: 'operation-a',
                        type: 'restore',
                        status: 'failed',
                        created_at: backup.created_at,
                        error: 'Import failed. Recover using the safety backup.',
                        backup_id: backup.id,
                        safety_backup_id: 'safety-a',
                    },
                ]}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Download', exact: true }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Restore', exact: true }),
        ).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Delete', exact: true }),
        ).toBeDisabled();
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Import failed. Recover using the safety backup.',
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Safety backup: safety-a',
        );
    });

    it('requires delete confirmation and blocks protected packages', async () => {
        const { rerender } = render(
            <ShowBackup {...common} backup={backup} events={paginated([])} />,
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Delete', exact: true }),
        );
        expect(mocks.delete).not.toHaveBeenCalled();
        await userEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'Delete backup',
            }),
        );
        expect(mocks.delete).toHaveBeenCalledWith(
            '/settings/system/backups/backup-a',
            expect.any(Object),
        );
        rerender(
            <ShowBackup
                {...common}
                backup={{ ...backup, protected: true }}
                events={paginated([])}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Delete', exact: true }),
        ).toBeDisabled();
    });

    it('shows external audit actor, source provenance, notes, selection and results after deletion', async () => {
        render(
            <BackupAuditPage
                events={paginated([event])}
                filters={{}}
                eventTypes={['backup.uploaded']}
            />,
        );
        expect(
            screen.getByRole('table', { name: 'Backup audit events' }),
        ).toBeInTheDocument();
        expect(screen.getByText('backup uploaded')).toBeInTheDocument();
        expect(screen.getByText('Imported for recovery')).toBeInTheDocument();
        await userEvent.click(screen.getByText('Original package provenance'));
        expect(screen.getByText('Original Creator')).toBeVisible();
        expect(screen.getByText('Before deployment')).toBeVisible();
        await userEvent.click(screen.getByRole('button', { name: /Filter/ }));
        expect(screen.getByLabelText('Backup ID')).toHaveAttribute(
            'name',
            'backup',
        );
    });

    it('stops polling on maintenance, cancels visits on unmount and reenables when completed', () => {
        vi.useFakeTimers();
        const { rerender, unmount } = render(inventory({ busy: true }));
        act(() => vi.advanceTimersByTime(4000));
        const options = mocks.reload.mock.calls[0][0] as {
            onCancelToken: (token: { cancel: () => void }) => void;
            onHttpException: (response: { status: number }) => boolean;
        };
        const cancel = vi.fn();
        options.onCancelToken({ cancel });
        rerender(inventory({ busy: false }));
        expect(cancel).toHaveBeenCalledOnce();
        act(() => vi.advanceTimersByTime(12000));
        expect(mocks.reload).toHaveBeenCalledOnce();
        rerender(inventory({ busy: true }));
        act(() => vi.advanceTimersByTime(4000));
        const next = mocks.reload.mock.calls[1][0] as typeof options;
        act(() => next.onHttpException({ status: 503 }));
        expect(screen.getByRole('alert')).toHaveTextContent('maintenance mode');
        act(() => vi.advanceTimersByTime(12000));
        expect(mocks.reload).toHaveBeenCalledTimes(2);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('shows readiness and catalog errors without permitting incomplete selection', async () => {
        render(
            <CreateBackup
                {...common}
                tableCatalog={[]}
                tableCatalogError="Table catalog unavailable. Check the database connection."
                prerequisites={[
                    {
                        label: 'Signing key',
                        ready: false,
                        message: 'Configure the deployment signing key.',
                    },
                ]}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Create backup' }),
        ).toBeDisabled();
        await userEvent.click(
            screen.getByRole('radio', { name: /^Selected tables/ }),
        );
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Table catalog unavailable',
        );
        expect(
            screen.getByText('Signing key: Action needed'),
        ).toBeInTheDocument();
    });

    it.each(['light', 'dark'])(
        'keeps inventory empty states and creation controls semantic in %s',
        (theme) => {
            document.documentElement.classList.toggle('dark', theme === 'dark');
            const { rerender } = render(inventory({ backups: paginated([]) }));
            expect(screen.getByText(/No backups yet/)).toBeInTheDocument();
            expect(
                screen
                    .getByRole('table')
                    .closest('[data-slot="data-table-container"]'),
            ).toHaveClass('bg-card');
            rerender(<CreateBackup {...common} tableCatalog={catalog} />);
            expect(screen.getByLabelText('Backup package')).toHaveClass(
                'min-w-0',
            );
        },
    );
});
