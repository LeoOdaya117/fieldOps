import { Head } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { BulkActionForm, BulkActions } from '@/components/ui/bulk-actions';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { TablePagination } from '@/components/ui/table-pagination';
import { roleTableColumns } from '@/features/access/role-table-model';
import type {
    Role,
    RoleTableFilters,
} from '@/features/access/role-table-model';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import { index as rolesIndex } from '@/routes/access/roles';

type PaginatedRoles = {
    data: Role[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
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
        <>
            <Head title="Roles" />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Roles"
                        description="Manage system templates and custom role definitions."
                    />
                    <div className="flex flex-wrap gap-2">
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
                                    <option value="unassigned">
                                        Unassigned
                                    </option>
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
                    </div>
                </div>

                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-border py-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle>Role catalog</CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    System roles are read-only for standard
                                    admins. Super Admins can manage every role
                                    template.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                {canDeleteRoles && (
                                    <BulkActions
                                        selectedIds={selectedRoleIds}
                                        onClear={() => setSelectedRoleIds([])}
                                    >
                                        <BulkActionForm
                                            action="/access/roles/bulk"
                                            method="delete"
                                            ids={selectedRoleIds}
                                            destructive
                                            onSubmit={(event) => {
                                                if (
                                                    !window.confirm(
                                                        `Delete ${selectedRoleIds.length} selected role(s)? This cannot be undone.`,
                                                    )
                                                ) {
                                                    event.preventDefault();
                                                }
                                            }}
                                        >
                                            <Trash2 />
                                            Delete selected
                                        </BulkActionForm>
                                    </BulkActions>
                                )}
                                <Badge variant="outline">
                                    {roleRows.length} visible
                                </Badge>
                                <Badge variant="secondary">
                                    {
                                        roleRows.filter((role) => role.isSystem)
                                            .length
                                    }{' '}
                                    system
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {roleRows.length === 0 ? (
                            <div className="px-6 py-12 text-center">
                                <p className="font-medium">No roles found</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Create a custom role to define a focused
                                    access profile.
                                </p>
                            </div>
                        ) : (
                            <DataTable
                                caption="FieldOps role catalog"
                                className="min-w-[980px]"
                                containerClassName="rounded-none border-0 shadow-none ring-0"
                                data={roleRows}
                                tableColumns={tableColumns}
                                getRowKey={(role) => role.id}
                            />
                        )}
                        {pagination && (
                            <TablePagination
                                currentPage={pagination.current_page}
                                lastPage={pagination.last_page}
                                total={pagination.total}
                                from={pagination.from}
                                to={pagination.to}
                                itemLabel="roles"
                                previousUrl={previousUrl}
                                nextUrl={nextUrl}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

RolesPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Roles', href: rolesIndex() },
    ],
};
