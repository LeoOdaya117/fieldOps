import { Form } from '@inertiajs/react';
import { CalendarDays, Clock3, Mail, ShieldCheck } from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { DataTableColumn } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { TableActionForm, TableActions } from '@/components/ui/table-actions';

export type RoleOption = {
    id: number;
    name: string;
    display_name: string;
    is_system: boolean;
};

export type UserRow = {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'suspended';
    role: {
        id: number;
        name: string;
        displayName: string;
        isSystem: boolean;
    } | null;
    createdAt: string | null;
};

export type Invitation = {
    id: number;
    email: string;
    role: { id: number; name: string; displayName: string };
    expiresAt: string;
};

export type UserTableFilters = {
    search: string;
    status: string;
    sort?: string;
    direction?: 'asc' | 'desc';
};

function UserStatus({ status }: { status: UserRow['status'] }) {
    return (
        <Badge
            variant="outline"
            className={
                status === 'active'
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
            }
        >
            <span className="size-1.5 rounded-full bg-current" />
            {status}
        </Badge>
    );
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function invitationTableColumns(): DataTableColumn<Invitation>[] {
    return [
        {
            key: 'serial',
            header: '#',
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_invitation, index) => index + 1,
        },
        {
            key: 'email',
            header: 'Email',
            headerClassName: 'px-6',
            cellClassName: 'px-6',
            cell: (invitation) => (
                <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Mail className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <div className="truncate font-medium">
                            {invitation.email}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            Awaiting acceptance
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            cell: (invitation) => (
                <Badge variant="secondary">{invitation.role.displayName}</Badge>
            ),
        },
        {
            key: 'expires',
            header: 'Expires',
            cell: (invitation) => (
                <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <Clock3 className="size-3.5 text-muted-foreground" />
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (invitation) => (
                <TableActions label={`Actions for ${invitation.email}`}>
                    <TableActionForm
                        action={`/access/users/invitations/${invitation.id}/resend`}
                        method="post"
                    >
                        Resend
                    </TableActionForm>
                    <TableActionForm
                        action={`/access/users/invitations/${invitation.id}`}
                        method="delete"
                        destructive
                        confirmation={{
                            title: 'Revoke this invitation?',
                            description:
                                'The invitation link will stop working immediately. The recipient will need a new invitation to access the workspace.',
                            confirmLabel: 'Revoke invitation',
                        }}
                    >
                        Revoke
                    </TableActionForm>
                </TableActions>
            ),
        },
    ];
}

type UserTableOptions = {
    roles: RoleOption[];
    filters: UserTableFilters;
    canSuspend: boolean;
    canReactivate: boolean;
    selectedUserIds: number[];
    allUsersSelected: boolean;
    someUsersSelected: boolean;
    firstUserNumber: number;
    toggleUser: (id: number, selected: boolean) => void;
    toggleAllUsers: (selected: boolean) => void;
};

export function userTableColumns({
    roles,
    filters,
    canSuspend,
    canReactivate,
    selectedUserIds,
    allUsersSelected,
    someUsersSelected,
    firstUserNumber,
    toggleUser,
    toggleAllUsers,
}: UserTableOptions): DataTableColumn<UserRow>[] {
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'asc';

    return [
        {
            key: 'selection',
            header: (
                <Checkbox
                    checked={
                        someUsersSelected ? 'indeterminate' : allUsersSelected
                    }
                    onCheckedChange={(checked) =>
                        toggleAllUsers(checked === true)
                    }
                    aria-label="Select all users"
                />
            ),
            headerClassName: 'w-12 px-4 text-center',
            cellClassName: 'w-12 px-4 text-center',
            cell: (user) => (
                <Checkbox
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={(checked) =>
                        toggleUser(user.id, checked === true)
                    }
                    aria-label={`Select ${user.name}`}
                />
            ),
        },
        {
            key: 'serial',
            header: '#',
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_user, index) => firstUserNumber + index,
        },
        {
            key: 'user',
            header: (
                <SortableColumn
                    action="/access/users"
                    label="User"
                    sortKey="name"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        search: filters.search,
                        status: filters.status,
                    }}
                />
            ),
            headerClassName: 'px-6',
            cellClassName: 'px-6',
            cell: (user) => (
                <div className="flex items-center gap-3">
                    <Avatar className="size-9 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                            {initials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="truncate font-semibold">
                            {user.name}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                            <Mail className="size-3.5 shrink-0" />
                            {user.email}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: (
                <SortableColumn
                    action="/access/users"
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        search: filters.search,
                        status: filters.status,
                    }}
                />
            ),
            cell: (user) => <UserStatus status={user.status} />,
        },
        {
            key: 'role',
            header: 'Role',
            cell: (user) => (
                <Form
                    action={`/access/users/${user.id}/role`}
                    method="patch"
                    className="flex min-w-[220px] gap-2"
                >
                    <span className="sr-only">Assign role</span>
                    <select
                        name="role_id"
                        defaultValue={user.role?.id ?? ''}
                        className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                        aria-label={`Role for ${user.name}`}
                    >
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                                {role.display_name}
                            </option>
                        ))}
                    </select>
                    <Button variant="outline" size="sm">
                        Save
                    </Button>
                </Form>
            ),
        },
        {
            key: 'created',
            header: (
                <SortableColumn
                    action="/access/users"
                    label="Created"
                    sortKey="created_at"
                    sort={sort}
                    direction={direction}
                    hidden={{
                        search: filters.search,
                        status: filters.status,
                    }}
                />
            ),
            cell: (user) => (
                <div className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : '—'}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (user) =>
                (user.status === 'active' ? canSuspend : canReactivate) ? (
                    <TableActions label={`Actions for ${user.name}`}>
                        {user.status === 'active' ? (
                            <TableActionForm
                                action={`/access/users/${user.id}/suspend`}
                                method="patch"
                                destructive
                                confirmation={{
                                    title: `Suspend ${user.name}?`,
                                    description:
                                        'This account will lose access immediately. You can reactivate it later from the user table.',
                                    confirmLabel: 'Suspend user',
                                }}
                            >
                                Suspend
                            </TableActionForm>
                        ) : (
                            <TableActionForm
                                action={`/access/users/${user.id}/reactivate`}
                                method="patch"
                            >
                                <ShieldCheck />
                                Reactivate
                            </TableActionForm>
                        )}
                    </TableActions>
                ) : null,
        },
    ];
}
