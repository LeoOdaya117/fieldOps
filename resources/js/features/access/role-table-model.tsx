import { Edit, Eye, KeyRound, ShieldCheck, Trash2, Users } from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { DataTableColumn } from '@/components/ui/data-table';
import {
    TableActionForm,
    TableActionLink,
    TableActions,
} from '@/components/ui/table-actions';
import { edit as editRole, show as showRole } from '@/routes/access/roles';

export type Role = {
    id: number;
    name: string;
    displayName: string;
    description: string | null;
    isSystem: boolean;
    usersCount: number;
    permissionsCount: number;
};

export type RoleTableFilters = {
    search: string;
    type: string;
    assigned: string;
    permissionsMin: string;
    perPage?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

type RoleTableOptions = {
    canManageSystemRoles: boolean;
    canDeleteRoles: boolean;
    selectedRoleIds: number[];
    allRolesSelected: boolean;
    someRolesSelected: boolean;
    firstRoleNumber: number;
    filters: RoleTableFilters;
    toggleRole: (id: number, selected: boolean) => void;
    toggleAllRoles: (selected: boolean) => void;
};

export function roleTableColumns({
    canManageSystemRoles,
    canDeleteRoles,
    selectedRoleIds,
    allRolesSelected,
    someRolesSelected,
    firstRoleNumber,
    filters,
    toggleRole,
    toggleAllRoles,
}: RoleTableOptions): DataTableColumn<Role>[] {
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'asc';

    return [
        {
            key: 'selection',
            header: (
                <Checkbox
                    checked={
                        someRolesSelected ? 'indeterminate' : allRolesSelected
                    }
                    onCheckedChange={(checked) =>
                        toggleAllRoles(checked === true)
                    }
                    aria-label="Select all roles"
                />
            ),
            headerClassName: 'w-12 px-4 text-center',
            cellClassName: 'w-12 px-4 text-center',
            cell: (role) => {
                const canManageRole = canManageSystemRoles || !role.isSystem;

                return (
                    <Checkbox
                        checked={selectedRoleIds.includes(role.id)}
                        disabled={!canManageRole || !canDeleteRoles}
                        onCheckedChange={(checked) =>
                            toggleRole(role.id, checked === true)
                        }
                        aria-label={`Select ${role.displayName}`}
                    />
                );
            },
        },
        {
            key: 'serial',
            header: '#',
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_role, index) => firstRoleNumber + index,
        },
        {
            key: 'role',
            header: (
                <SortableColumn
                    action="/access/roles"
                    label="Role"
                    sortKey="display_name"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        search: filters.search,
                        type: filters.type,
                        assigned: filters.assigned,
                        permissions_min: filters.permissionsMin,
                    }}
                />
            ),
            headerClassName: 'px-6',
            cellClassName: 'px-6',
            cell: (role) => (
                <div className="flex min-w-[280px] items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-link/10 text-link ring-1 ring-link/15">
                        <ShieldCheck className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <div className="font-semibold text-foreground">
                            {role.displayName}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                {role.name}
                            </code>
                            <span className="text-xs text-muted-foreground">
                                Role template
                            </span>
                        </div>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                            {role.description ?? 'No description provided.'}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'type',
            header: (
                <SortableColumn
                    action="/access/roles"
                    label="Type"
                    sortKey="is_system"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        search: filters.search,
                        type: filters.type,
                        assigned: filters.assigned,
                        permissions_min: filters.permissionsMin,
                    }}
                />
            ),
            cell: (role) => {
                const roleType = role.isSystem
                    ? canManageSystemRoles
                        ? 'System'
                        : 'Protected'
                    : 'Custom';

                return (
                    <Badge
                        variant={role.isSystem ? 'secondary' : 'outline'}
                        className="gap-1.5"
                    >
                        <span className="size-1.5 rounded-full bg-current" />
                        {roleType}
                    </Badge>
                );
            },
        },
        {
            key: 'assigned',
            header: (
                <SortableColumn
                    action="/access/roles"
                    label="Assigned users"
                    sortKey="users_count"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        search: filters.search,
                        type: filters.type,
                        assigned: filters.assigned,
                        permissions_min: filters.permissionsMin,
                    }}
                />
            ),
            cell: (role) => (
                <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Users className="size-3.5" />
                    </span>
                    <div>
                        <div className="font-semibold tabular-nums">
                            {role.usersCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            assigned account{role.usersCount === 1 ? '' : 's'}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'permissions',
            header: (
                <SortableColumn
                    action="/access/roles"
                    label="Permissions"
                    sortKey="permissions_count"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        search: filters.search,
                        type: filters.type,
                        assigned: filters.assigned,
                        permissions_min: filters.permissionsMin,
                    }}
                />
            ),
            cell: (role) => (
                <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <KeyRound className="size-3.5" />
                    </span>
                    <div>
                        <div className="font-semibold tabular-nums">
                            {role.permissionsCount === 0
                                ? 'Managed'
                                : role.permissionsCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {role.permissionsCount === 0
                                ? 'policy access'
                                : `permission${role.permissionsCount === 1 ? '' : 's'}`}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (role) => {
                const canManageRole = canManageSystemRoles || !role.isSystem;

                return (
                    <TableActions label={`Actions for ${role.displayName}`}>
                        <TableActionLink href={showRole.url(role.id)}>
                            <Eye />
                            View
                        </TableActionLink>
                        {canManageRole && (
                            <>
                                <TableActionLink
                                    href={editRole.url(role.id)}
                                    aria-label={`Edit ${role.displayName}`}
                                >
                                    <Edit />
                                    Edit
                                </TableActionLink>
                                <TableActionForm
                                    action={`/access/roles/${role.id}`}
                                    method="delete"
                                    destructive
                                    confirmation={{
                                        title: `Delete ${role.displayName}?`,
                                        description:
                                            'This will archive the role and remove it from active role lists. You can restore it later from the audit history.',
                                        confirmLabel: 'Delete',
                                    }}
                                >
                                    <Trash2 />
                                    <span>Delete</span>
                                </TableActionForm>
                            </>
                        )}
                    </TableActions>
                );
            },
        },
    ];
}
