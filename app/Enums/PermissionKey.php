<?php

namespace App\Enums;

enum PermissionKey: string
{
    case DashboardView = 'dashboard.view';
    case UsersView = 'users.view';
    case UsersCreate = 'users.create';
    case UsersInvite = 'users.invite';
    case UsersUpdate = 'users.update';
    case UsersDelete = 'users.delete';
    case UsersSuspend = 'users.suspend';
    case UsersReviewRegistrations = 'users.review_registrations';
    case UsersViewDeleted = 'users.view_deleted';
    case UsersUpdateDeleted = 'users.update_deleted';
    case RolesView = 'roles.view';
    case RolesCreate = 'roles.create';
    case RolesUpdate = 'roles.update';
    case RolesDelete = 'roles.delete';
    case RolesAssign = 'roles.assign';
    case RolesViewDeleted = 'roles.view_deleted';
    case RolesUpdateDeleted = 'roles.update_deleted';
    case AuditView = 'audit.view';
    case IpBlocksView = 'ip_blocks.view';
    case IpBlocksCreate = 'ip_blocks.create';
    case IpBlocksUpdate = 'ip_blocks.update';
    case IpBlocksDelete = 'ip_blocks.delete';
    case IpBlocksViewDeleted = 'ip_blocks.view_deleted';
    case IpBlocksUpdateDeleted = 'ip_blocks.update_deleted';
    case VisitLogsView = 'visit_logs.view';
    case SettingsView = 'settings.view';
    case SettingsUpdate = 'settings.update';
    case CountriesView = 'countries.view';
    case CountriesCreate = 'countries.create';
    case CountriesUpdate = 'countries.update';
    case CountriesDelete = 'countries.delete';
    case CountriesViewDeleted = 'countries.view_deleted';
    case CountriesUpdateDeleted = 'countries.update_deleted';
    case TimezonesView = 'timezones.view';
    case TimezonesCreate = 'timezones.create';
    case TimezonesUpdate = 'timezones.update';
    case TimezonesDelete = 'timezones.delete';
    case TimezonesViewDeleted = 'timezones.view_deleted';
    case TimezonesUpdateDeleted = 'timezones.update_deleted';
    case OrganizationLocationsView = 'organization_locations.view';
    case OrganizationLocationsCreate = 'organization_locations.create';
    case OrganizationLocationsUpdate = 'organization_locations.update';
    case OrganizationLocationsDelete = 'organization_locations.delete';
    case OrganizationLocationsViewDeleted = 'organization_locations.view_deleted';
    case OrganizationLocationsUpdateDeleted = 'organization_locations.update_deleted';
    case MediaAssetsView = 'media_assets.view';
    case MediaAssetsCreate = 'media_assets.create';
    case MediaAssetsUpdate = 'media_assets.update';
    case MediaAssetsDelete = 'media_assets.delete';
    case MediaAssetsViewDeleted = 'media_assets.view_deleted';
    case MediaAssetsUpdateDeleted = 'media_assets.update_deleted';
    case FilesView = 'files.view';
    case FilesCreate = 'files.create';
    case FilesUpdate = 'files.update';
    case FilesDelete = 'files.delete';
    case FilesViewDeleted = 'files.view_deleted';
    case FilesUpdateDeleted = 'files.update_deleted';
    case UsersExportPdf = 'users.export_pdf';
    case UsersExportCsv = 'users.export_csv';
    case UsersExportXlsx = 'users.export_xlsx';
    case UsersExportPrint = 'users.export_print';
    case RolesExportPdf = 'roles.export_pdf';
    case RolesExportCsv = 'roles.export_csv';
    case RolesExportXlsx = 'roles.export_xlsx';
    case RolesExportPrint = 'roles.export_print';
    case AuditExportPdf = 'audit.export_pdf';
    case AuditExportCsv = 'audit.export_csv';
    case AuditExportXlsx = 'audit.export_xlsx';
    case AuditExportPrint = 'audit.export_print';
    case IpBlocksExportPdf = 'ip_blocks.export_pdf';
    case IpBlocksExportCsv = 'ip_blocks.export_csv';
    case IpBlocksExportXlsx = 'ip_blocks.export_xlsx';
    case IpBlocksExportPrint = 'ip_blocks.export_print';
    case VisitLogsExportPdf = 'visit_logs.export_pdf';
    case VisitLogsExportCsv = 'visit_logs.export_csv';
    case VisitLogsExportXlsx = 'visit_logs.export_xlsx';
    case VisitLogsExportPrint = 'visit_logs.export_print';
    case FilesExportPdf = 'files.export_pdf';
    case FilesExportCsv = 'files.export_csv';
    case FilesExportXlsx = 'files.export_xlsx';
    case FilesExportPrint = 'files.export_print';
    case MediaAssetsExportPdf = 'media_assets.export_pdf';
    case MediaAssetsExportCsv = 'media_assets.export_csv';
    case MediaAssetsExportXlsx = 'media_assets.export_xlsx';
    case MediaAssetsExportPrint = 'media_assets.export_print';
    case CountriesExportPdf = 'countries.export_pdf';
    case CountriesExportCsv = 'countries.export_csv';
    case CountriesExportXlsx = 'countries.export_xlsx';
    case CountriesExportPrint = 'countries.export_print';
    case TimezonesExportPdf = 'timezones.export_pdf';
    case TimezonesExportCsv = 'timezones.export_csv';
    case TimezonesExportXlsx = 'timezones.export_xlsx';
    case TimezonesExportPrint = 'timezones.export_print';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(static fn (self $permission): string => $permission->value, self::cases());
    }

    /** @param list<string> $namespaces
     * @return list<string>
     */
    public static function exportValuesFor(array $namespaces): array
    {
        $permissions = [];

        foreach (self::cases() as $permission) {
            foreach ($namespaces as $namespace) {
                if (str_starts_with($permission->value, $namespace.'.export_')) {
                    $permissions[] = $permission->value;
                    break;
                }
            }
        }

        return $permissions;
    }
}
