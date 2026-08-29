import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ActionLink } from '@/components/action-link';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { BulkActionForm, BulkActions } from '@/components/ui/bulk-actions';
import { Input } from '@/components/ui/input';
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
    canDeleteRoles = true,
    filters = { search: '', type: '', assigned: '', permissionsMin: '' },
}: {
    roles: PaginatedRoles | Role[];
    canManageSystemRoles?: boolean;
    canDeleteRoles?: boolean;
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

    return (
        <IndexPage
            title="Roles"
            description="Manage system templates and custom role definitions."
            actions={
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
                            ].filter(Boolean).length
                        }
                        pageSize={pageSize}
                    >
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
                        <div className="grid gap-2">
                            <label
                                htmlFor="role-type"
                                className="text-sm font-medium"
                            >
                                Role type
                            </label>
                            <select
                                id="role-type"
                                name="type"
                                defaultValue={filters.type}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">All roles</option>
                                <option value="system">System roles</option>
                                <option value="custom">Custom roles</option>
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label
                                htmlFor="role-assigned"
                                className="text-sm font-medium"
                            >
                                Assignment
                            </label>
                            <select
                                id="role-assigned"
                                name="assigned"
                                defaultValue={filters.assigned}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Any assignment</option>
                                <option value="assigned">
                                    Assigned to users
                                </option>
                                <option value="unassigned">Unassigned</option>
                            </select>
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
                    </SearchFilterSheet>
                    <ActionLink href="/access/roles/create">
                        <Plus />
                        Create role
                    </ActionLink>
                </>
            }
        >
            <IndexPageSection
                toolbar={
                    canDeleteRoles && selectedRoleIds.length > 0 ? (
                        <div data-slot="bulk-actions-row" className="w-full">
                            <BulkActions
                                selectedIds={selectedRoleIds}
                                onClear={() => setSelectedRoleIds([])}
                                className="justify-start sm:justify-end"
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
                                        confirmLabel: 'Delete roles',
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
            >
                {roleRows.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <p className="font-medium">No roles found</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create a custom role to define a focused access
                            profile.
                        </p>
                    </div>
                ) : (
                    <DataTable
                        caption="FieldOps role catalog"
                        className="min-w-[980px]"
                        containerClassName="rounded-none border-0 shadow-none ring-0"
                        scrollContainerClassName="px-4"
                        data={roleRows}
                        tableColumns={tableColumns}
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
                                      itemLabel: 'roles',
                                      previousUrl,
                                      nextUrl,
                                  }
                                : null
                        }
                    />
                )}
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
