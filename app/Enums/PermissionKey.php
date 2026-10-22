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

    case AssetsView = 'assets.view';
    case AssetsCreate = 'assets.create';
    case AssetsUpdate = 'assets.update';
    case AssetsDelete = 'assets.delete';
    case AssetsViewDeleted = 'assets.view_deleted';
    case AssetsUpdateDeleted = 'assets.update_deleted';
    case AssetsExportPdf = 'assets.export_pdf';
    case AssetsExportCsv = 'assets.export_csv';
    case AssetsExportXlsx = 'assets.export_xlsx';
    case AssetsExportPrint = 'assets.export_print';
    case WorkOrdersView = 'work_orders.view';
    case WorkOrdersCreate = 'work_orders.create';
    case WorkOrdersUpdate = 'work_orders.update';
    case WorkOrdersDelete = 'work_orders.delete';
    case WorkOrdersViewDeleted = 'work_orders.view_deleted';
    case WorkOrdersUpdateDeleted = 'work_orders.update_deleted';
    case WorkOrdersExportPdf = 'work_orders.export_pdf';
    case WorkOrdersExportCsv = 'work_orders.export_csv';
    case WorkOrdersExportXlsx = 'work_orders.export_xlsx';
    case WorkOrdersExportPrint = 'work_orders.export_print';
    case InspectionTemplatesView = 'inspection_templates.view';
    case InspectionTemplatesCreate = 'inspection_templates.create';
    case InspectionTemplatesUpdate = 'inspection_templates.update';
    case InspectionTemplatesDelete = 'inspection_templates.delete';
    case InspectionTemplatesViewDeleted = 'inspection_templates.view_deleted';
    case InspectionTemplatesUpdateDeleted = 'inspection_templates.update_deleted';
    case InspectionTemplatesExportPdf = 'inspection_templates.export_pdf';
    case InspectionTemplatesExportCsv = 'inspection_templates.export_csv';
    case InspectionTemplatesExportXlsx = 'inspection_templates.export_xlsx';
    case InspectionTemplatesExportPrint = 'inspection_templates.export_print';
    case InspectionsView = 'inspections.view';
    case InspectionsCreate = 'inspections.create';
    case InspectionsUpdate = 'inspections.update';
    case InspectionsDelete = 'inspections.delete';
    case InspectionsViewDeleted = 'inspections.view_deleted';
    case InspectionsUpdateDeleted = 'inspections.update_deleted';
    case InspectionsExportPdf = 'inspections.export_pdf';
    case InspectionsExportCsv = 'inspections.export_csv';
    case InspectionsExportXlsx = 'inspections.export_xlsx';
    case InspectionsExportPrint = 'inspections.export_print';
    case IssuesView = 'issues.view';
    case IssuesCreate = 'issues.create';
    case IssuesUpdate = 'issues.update';
    case IssuesDelete = 'issues.delete';
    case IssuesViewDeleted = 'issues.view_deleted';
    case IssuesUpdateDeleted = 'issues.update_deleted';
    case IssuesExportPdf = 'issues.export_pdf';
    case IssuesExportCsv = 'issues.export_csv';
    case IssuesExportXlsx = 'issues.export_xlsx';
    case IssuesExportPrint = 'issues.export_print';
    case WorkOrdersAssign = 'work_orders.assign';
    case InspectionsSubmit = 'inspections.submit';
    case InspectionsReview = 'inspections.review';
    case IssuesResolve = 'issues.resolve';
    case OperationsMapView = 'operations_map.view';
    case OperationsDashboardView = 'operations_dashboard.view';
    case OperationalReportsView = 'operational_reports.view';
    case OperationalReportsExportPdf = 'operational_reports.export_pdf';
    case OperationalReportsExportCsv = 'operational_reports.export_csv';
    case OperationalReportsExportXlsx = 'operational_reports.export_xlsx';
    case OperationalReportsExportPrint = 'operational_reports.export_print';

    /** @return list<string> */
    public static function operationalValues(): array
    {
        return array_values(array_filter(self::values(), static fn (string $permission): bool => in_array(
            explode('.', $permission)[0],
            ['assets', 'work_orders', 'inspection_templates', 'inspections', 'issues', 'operations_map', 'operations_dashboard', 'operational_reports'],
            true,
        )));
    }

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
