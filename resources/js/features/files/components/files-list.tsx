import { Link, router } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { FileDropzone } from '@/components/file-dropzone';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { DataTable } from '@/components/ui/data-table';
import type { DataTableColumn } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import { RecordStatusControl } from '@/components/ui/record-status-control';
import { TableActionLink, TableActions } from '@/components/ui/table-actions';
import { FileThumbnail, formatFileSize } from '@/features/files/file-display';
import { useFileUploads } from '@/features/files/hooks/use-file-uploads';
import { formatDateTime } from '@/lib/format-date';
import {
    index as filesIndex,
    show as filesShow,
    store as filesStore,
} from '@/routes/files';
import type { FileDto, FilePagination } from '@/types';

export type FilesListProps = {
    files: FilePagination;
    filters: {
        search?: string;
        record_status?: string;
        module?: string;
        per_page?: number;
    };
    canCreate: boolean;
    canViewDeleted: boolean;
    canUpdateDeleted: boolean;
};

export function FilesList({
    files,
    filters,
    canCreate,
    canViewDeleted,
    canUpdateDeleted,
}: FilesListProps) {
    const uploads = useFileUploads<FileDto>({
        url: filesStore.url(),
        maxFiles: 3,
        maxBytes: 100 * 1024 * 1024,
        fields: { module: 'files' },
        onUploaded: () => router.reload({ only: ['files'] }),
    });
    const pageSize = files.per_page ?? filters.per_page ?? DEFAULT_PAGE_SIZE;
    const previousUrl = files.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = files.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;

    const columns: DataTableColumn<FileDto>[] = [
        {
            key: 'display',
            header: 'Display',
            hideable: false,
            headerClassName: 'w-16',
            cell: (file) => <FileThumbnail file={file} className="size-10" />,
        },
        {
            key: 'name',
            header: 'Name',
            cell: (file) => (
                <Link
                    href={filesShow.url(file.token)}
                    className="block max-w-72 truncate font-medium text-link underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
                    title={file.name}
                >
                    {file.name}
                </Link>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            cell: (file) => file.extension.toUpperCase(),
        },
        {
            key: 'size',
            header: 'Size',
            cellClassName: 'whitespace-nowrap tabular-nums',
            cell: (file) => formatFileSize(file.sizeBytes),
        },
        {
            key: 'dimensions',
            header: 'Dimensions',
            cellClassName: 'whitespace-nowrap tabular-nums',
            cell: (file) =>
                file.width && file.height
                    ? `${file.width} × ${file.height} px`
                    : '—',
        },
        {
            key: 'module',
            header: 'Module',
            cell: (file) => file.module,
        },
        {
            key: 'tag',
            header: 'Tag',
            cell: (file) => file.tag || '—',
        },
        {
            key: 'created_at',
            header: 'Uploaded',
            cellClassName: 'whitespace-nowrap',
            cell: (file) => formatDateTime(file.createdAt),
        },
        {
            key: 'record_status',
            header: 'Record status',
            cell: (file) => (
                <RecordStatusControl
                    recordStatus={file.recordStatus}
                    label={file.name}
                    recordStatusUrl={file.recordStatusUrl ?? undefined}
                    canUpdateDeleted={canUpdateDeleted}
                />
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            hideable: false,
            headerClassName: 'text-right',
            cellClassName: 'text-right',
            cell: (file) => (
                <TableActions label={`Actions for ${file.name}`}>
                    <TableActionLink href={filesShow.url(file.token)}>
                        <Eye />
                        View
                    </TableActionLink>
                </TableActions>
            ),
        },
    ];

    const tableActions = (
        <SearchFilterSheet
            action={filesIndex.url()}
            resetHref={filesIndex.url()}
            title="Search and filter files"
            description="Find a file by name, tag, module, or record status."
            activeFilterCount={
                [
                    filters.search,
                    filters.module,
                    filters.record_status === 'inactive',
                ].filter(Boolean).length
            }
            pageSize={pageSize}
            keyword={
                <div className="grid gap-2">
                    <Label htmlFor="files-search">Search</Label>
                    <Input
                        id="files-search"
                        name="search"
                        defaultValue={filters.search ?? ''}
                        placeholder="Name or tag"
                        autoFocus
                    />
                </div>
            }
        >
            <div className="grid gap-2">
                <Label htmlFor="files-module">Module</Label>
                <AdaptiveSelect
                    id="files-module"
                    name="module"
                    multiple={false}
                    defaultValue={filters.module ?? ''}
                    placeholder="All modules"
                    options={[
                        { value: 'files', label: 'Files' },
                        { value: 'gallery', label: 'Gallery' },
                        { value: 'avatars', label: 'Avatars' },
                    ]}
                />
            </div>
            {canViewDeleted ? (
                <div className="grid gap-2">
                    <Label htmlFor="files-status">Record status</Label>
                    <AdaptiveSelect
                        id="files-status"
                        name="record_status"
                        multiple={false}
                        defaultValue={filters.record_status ?? 'active'}
                        options={[
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' },
                        ]}
                    />
                </div>
            ) : null}
        </SearchFilterSheet>
    );

    return (
        <IndexPage
            title="Files"
            description="Browse and manage uploaded files you can access."
        >
            {canCreate ? (
                <IndexPageSection
                    title="Add files"
                    description="Upload up to three files, 100 MB each."
                >
                    <div className="p-4 sm:p-6">
                        <FileDropzone
                            label="Choose files or drop them here"
                            hint="Up to 3 files, 100 MB each"
                            multiple
                            entries={uploads.entries}
                            error={uploads.error}
                            onFiles={(selected) =>
                                void uploads.addFiles(selected)
                            }
                            onRetry={(id) => void uploads.retry(id)}
                            onRemove={uploads.remove}
                        />
                    </div>
                </IndexPageSection>
            ) : null}
            <IndexPageSection>
                <DataTable
                    caption="File library"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={files.data}
                    tableColumns={columns}
                    actions={tableActions}
                    exportOptions={{
                        dataset: 'files',
                        permissionNamespaces: [
                            'files',
                            'media_assets',
                            'users',
                        ],
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
                        filters: {
                            search: filters.search,
                            record_status: filters.record_status,
                            module: filters.module,
                        },
                    }}
                    columnVisibility={{
                        storageKey: 'system.files',
                        defaultVisibleKeys: [
                            'name',
                            'type',
                            'size',
                            'module',
                            'created_at',
                            'record_status',
                        ],
                    }}
                    getRowKey={(file) => file.token}
                    pagination={{
                        currentPage: files.current_page ?? 1,
                        lastPage: files.last_page ?? 1,
                        total: files.total ?? files.data.length,
                        from: files.from ?? null,
                        to: files.to ?? null,
                        pageSize,
                        links: files.links,
                        itemLabel: 'files',
                        previousUrl,
                        nextUrl,
                    }}
                />
                {files.data.length === 0 ? (
                    <div
                        role="status"
                        className="border-t border-border px-4 py-12 text-center text-sm text-muted-foreground sm:px-6"
                    >
                        No files match the current filters. Adjust the filters
                        or upload a file.
                    </div>
                ) : null}
            </IndexPageSection>
        </IndexPage>
    );
}
