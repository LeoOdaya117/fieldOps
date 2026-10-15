export const EXPORT_FORMATS = ['pdf', 'csv', 'xlsx', 'print'] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export type ExportDataset =
    | 'users'
    | 'invitations'
    | 'registrations'
    | 'roles'
    | 'audit'
    | 'ip-blocks'
    | 'visit-logs'
    | 'files'
    | 'countries'
    | 'timezones';

export type ExportFilterValue =
    string | number | boolean | (string | number)[] | null | undefined;

export type DataTableExportOptions = {
    dataset: ExportDataset;
    permissionNamespaces: readonly string[];
    filters: Readonly<Record<string, ExportFilterValue>>;
    requiredPermissions?: readonly string[];
    permissionScopes?: readonly ExportPermissionScope[];
};

export type ExportPermissionScope = {
    module?: 'files' | 'gallery' | 'avatars';
    namespace: string;
    viewPermissions: readonly string[];
    deletedPermission?: string;
};

export type ExportResult = {
    status: 'ready' | 'queued';
    message: string;
    downloadUrl?: string;
    printUrl?: string;
};
