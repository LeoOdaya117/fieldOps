import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { BulkActionForm, BulkActions } from '@/components/ui/bulk-actions';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import { roleTableColumns } from '@/features/access/role-table-model';
import type {
    Role,
    RoleTableFilters,
} from '@/features/access/role-table-model';
import { dashboard } from '@/routes';
import { index as rolesIndex } from '@/routes/access/roles';

type PaginatedRoles = {
    data: Role[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page?: number;
    links?: { url: string | null; label: string; active: boolean }[];
};

export default function RolesPage({
    roles,
    canManageSystemRoles = false,
    canCreate = false,
    canDeleteRoles = true,
    canViewDeleted = false,
    canUpdateDeleted = false,
    filters = {
        search: '',
        type: '',
        assigned: '',
        permissionsMin: '',
    },
}: {
    roles: PaginatedRoles | Role[];
    canManageSystemRoles?: boolean;
    canCreate?: boolean;
    canDeleteRoles?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
    filters?: RoleTableFilters;
}) {
    const roleRows = Array.isArray(roles) ? roles : roles.data;
    const pagination = Array.isArray(roles) ? null : roles;
    const previousUrl = pagination?.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = pagination?.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;
    const pageSize =
        pagination?.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
    const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
    const visibleRoleIds = roleRows
        .filter(
            (role) =>
                canDeleteRoles && (canManageSystemRoles || !role.isSystem),
        )
        .map((role) => role.id);
    const allRolesSelected =
        visibleRoleIds.length > 0 &&
        visibleRoleIds.every((id) => selectedRoleIds.includes(id));
    const someRolesSelected = selectedRoleIds.length > 0 && !allRolesSelected;
    const firstRoleNumber = pagination?.from ?? 1;

    const toggleRole = (id: number, selected: boolean) => {
        setSelectedRoleIds((current) => {
            if (selected) {
                return current.includes(id) ? current : [...current, id];
            }

            return current.filter((selectedId) => selectedId !== id);
        });
    };

    const toggleAllRoles = (selected: boolean) => {
        setSelectedRoleIds(selected ? visibleRoleIds : []);
    };

    const tableColumns = () =>
        roleTableColumns({
            canManageSystemRoles,
            canDeleteRoles,
            selectedRoleIds,
            allRolesSelected,
            someRolesSelected,
            firstRoleNumber,
            filters,
            toggleRole,
            toggleAllRoles,
        });

    const tableActions = (
        <>
            <SearchFilterSheet
                action="/access/roles"
                resetHref="/access/roles"
                title="Search and filter roles"
                description="Find a role by name or narrow the catalog by type."
                activeFilterCount={
                    [
                        filters.search,
                        filters.type,
                        filters.assigned,
                        filters.permissionsMin,
                        filters.from,
                        filters.to,
                        filters.recordStatus,
                    ].filter(Boolean).length
                }
                pageSize={pageSize}
                keyword={
                    <div className="grid gap-2">
                        <label
                            htmlFor="role-search"
                            className="text-sm font-medium"
                        >
                            Search roles
                        </label>
                        <Input
                            id="role-search"
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Name, key, or description"
                            autoFocus
                        />
                    </div>
                }
                dateRange={
                    <div className="grid gap-2">
                        <label
                            htmlFor="role-date-range"
                            className="text-sm font-medium"
                        >
                            Date range
                        </label>
                        <DateRangePicker
                            id="role-date-range"
                            from={filters.from}
                            to={filters.to}
                            fromName="from"
                            toName="to"
                            label="Role date range"
                        />
                    </div>
                }
            >
                <div className="grid gap-2">
                    <label htmlFor="role-type" className="text-sm font-medium">
                        Role type
                    </label>
                    <AdaptiveSelect
                        id="role-type"
                        name="type"
                        multiple
                        defaultValue={filters.type}
                        placeholder="All roles"
                        options={[
                            { value: '', label: 'All roles' },
                            { value: 'system', label: 'System roles' },
                            { value: 'custom', label: 'Custom roles' },
                        ]}
                    />
                </div>
                <div className="grid gap-2">
                    <label
                        htmlFor="role-assigned"
                        className="text-sm font-medium"
                    >
                        Assignment
                    </label>
                    <AdaptiveSelect
                        id="role-assigned"
                        name="assigned"
                        multiple
                        defaultValue={filters.assigned}
                        placeholder="Any assignment"
                        options={[
                            { value: '', label: 'Any assignment' },
                            {
                                value: 'assigned',
                                label: 'Assigned to users',
                            },
                            { value: 'unassigned', label: 'Unassigned' },
                        ]}
                    />
                </div>
                <div className="grid gap-2">
                    <label
                        htmlFor="role-permissions-min"
                        className="text-sm font-medium"
                    >
                        Minimum permissions
                    </label>
                    <Input
                        id="role-permissions-min"
                        name="permissions_min"
                        type="number"
                        min="0"
                        defaultValue={filters.permissionsMin}
                        placeholder="0"
                    />
                </div>
                {canViewDeleted && (
                    <div className="grid gap-2">
                        <Label>Record status</Label>
                        <AdaptiveSelect
                            id="role-record-status"
                            name="record_status"
                            aria-label="Record status"
                            multiple
                            defaultValue={filters.recordStatus ?? 'active'}
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                            ]}
                        />
                    </div>
                )}
            </SearchFilterSheet>
            {canCreate && (
                <ActionLink href="/access/roles/create">
                    <Plus />
                    Create role
                </ActionLink>
            )}
        </>
    );

    return (
        <IndexPage
            title="Roles"
            description="Manage system templates and custom role definitions."
        >
            <IndexPageSection>
                <DataTable
                    caption="FieldOps role catalog"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={roleRows}
                    tableColumns={tableColumns}
                    actions={tableActions}
                    emptyState={
                        <>
                            <p className="font-medium">No roles found</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Create a custom role to define a focused access
                                profile.
                            </p>
                        </>
                    }
                    addDefaultColumns
                    canUpdateDeleted={canUpdateDeleted}
                    defaultColumnSort={{
                        action: rolesIndex.url(),
                        sort: filters.sort,
                        direction: filters.direction,
                        hidden: {
                            search: filters.search,
                            type: filters.type,
                            assigned: filters.assigned,
                            permissions_min: filters.permissionsMin,
                            from: filters.from,
                            to: filters.to,
                            record_status: filters.recordStatus,
                        },
                    }}
                    toolbar={
                        canDeleteRoles && selectedRoleIds.length > 0 ? (
                            <div
                                data-slot="bulk-actions-row"
                                className="min-w-0"
                            >
                                <BulkActions
                                    selectedIds={selectedRoleIds}
                                    onClear={() => setSelectedRoleIds([])}
                                    className="justify-start"
                                >
                                    <BulkActionForm
                                        action="/access/roles/bulk"
                                        method="delete"
                                        ids={selectedRoleIds}
                                        destructive
                                        confirmation={{
                                            title: `Delete ${selectedRoleIds.length} selected role(s)?`,
                                            description:
                                                'This action cannot be undone.',
                                            confirmLabel: 'Delete',
                                        }}
                                        onSuccess={() => setSelectedRoleIds([])}
                                    >
                                        <Trash2 />
                                        Delete selected
                                    </BulkActionForm>
                                </BulkActions>
                            </div>
                        ) : null
                    }
                    columnVisibility={{
                        storageKey: 'access.roles.v2',
                        defaultVisibleKeys: [
                            'role',
                            'type',
                            'assigned',
                            'permissions',
                            'created_at',
                            'updated_at',
                            'created_by',
                            'updated_by',
                            'status',
                            'record_status',
                        ],
                    }}
                    getRowKey={(role) => role.id}
                    pagination={
                        pagination
                            ? {
                                  currentPage: pagination.current_page,
                                  lastPage: pagination.last_page,
                                  total: pagination.total,
                                  from: pagination.from,
                                  to: pagination.to,
                                  pageSize,
                                  links: pagination.links,
                                  itemLabel: 'roles',
                                  previousUrl,
                                  nextUrl,
                              }
                            : null
                    }
                />
            </IndexPageSection>
        </IndexPage>
    );
}

RolesPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Roles', href: rolesIndex() },
    ],
};
