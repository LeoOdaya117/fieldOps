import { EXPORT_FORMATS } from '@/features/exports/types';
import type {
    DataTableExportOptions,
    ExportFilterValue,
    ExportFormat,
} from '@/features/exports/types';

const paginationKeys = new Set(['page', 'per_page', 'perpage']);

export function buildExportFilters(
    filters: Readonly<Record<string, ExportFilterValue>>,
): Record<string, Exclude<ExportFilterValue, null | undefined>> {
    return Object.fromEntries(
        Object.entries(filters).filter(([key, value]) => {
            if (paginationKeys.has(key.toLowerCase())) {
                return false;
            }

            if (value === null || value === undefined || value === '') {
                return false;
            }

            return !Array.isArray(value) || value.length > 0;
        }),
    ) as Record<string, Exclude<ExportFilterValue, null | undefined>>;
}

export function getAvailableExportFormats(
    options: DataTableExportOptions,
    permissions: readonly string[],
): ExportFormat[] {
    return EXPORT_FORMATS.filter((format) => {
        const hasFormatPermission = options.permissionScopes
            ? options.permissionScopes.some((scope) => {
                  const selectedModule = options.filters.module;
                  const moduleMatches =
                      selectedModule === null ||
                      selectedModule === undefined ||
                      selectedModule === '' ||
                      (typeof selectedModule === 'string' &&
                          scope.module === selectedModule);
                  const canViewModule = scope.viewPermissions.some(
                      (permission) => permissions.includes(permission),
                  );
                  const canViewDeleted =
                      options.filters.record_status !== 'inactive' ||
                      scope.deletedPermission === undefined ||
                      permissions.includes(scope.deletedPermission);

                  return (
                      moduleMatches &&
                      canViewModule &&
                      canViewDeleted &&
                      permissions.includes(
                          `${scope.namespace}.export_${format}`,
                      )
                  );
              })
            : options.permissionNamespaces.some((namespace) =>
                  permissions.includes(`${namespace}.export_${format}`),
              );

        return (
            hasFormatPermission &&
            (options.requiredPermissions ?? []).every((permission) =>
                permissions.includes(permission),
            )
        );
    });
}
