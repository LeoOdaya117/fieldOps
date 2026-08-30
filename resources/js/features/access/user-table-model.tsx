import {
    CalendarDays,
    Clock3,
    Eye,
    Mail,
    Pencil,
    ShieldCheck,
    ShieldOff,
    Trash2,
} from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { DataTableColumn } from '@/components/ui/data-table';
import {
    TableActionForm,
    TableActionLink,
    TableActions,
} from '@/components/ui/table-actions';
import {
    destroy as deleteUser,
    edit as editUser,
    show as showUser,
} from '@/routes/access/users';

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
    position: string | null;
    department: string | null;
    avatar: string | null;
    status: 'active' | 'suspended';
    role: {
        id: number;
        name: string;
        displayName: string;
        isSystem: boolean;
    } | null;
    canDelete?: boolean;
    createdAt: string | null;
};

export type Invitation = {
    id: number;
    email: string;
    role: { id: number; name: string; displayName: string };
    expiresAt: string;
};

export type Registration = {
    id: number;
    name: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string | null;
};

export type UserTableFilters = {
    search: string;
    status: string;
    perPage?: number;
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
            hideable: false,
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_invitation, index) => index + 1,
        },
        {
            key: 'email',
            header: 'Email',
            label: 'Email',
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
            label: 'Role',
            cell: (invitation) => (
                <Badge variant="secondary">{invitation.role.displayName}</Badge>
            ),
        },
        {
            key: 'expires',
            header: 'Expires',
            label: 'Expires',
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
            hideable: false,
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

export function registrationTableColumns(): DataTableColumn<Registration>[] {
    return [
        {
            key: 'applicant',
            header: 'Applicant',
            label: 'Applicant',
            headerClassName: 'px-6',
            cellClassName: 'px-6',
            cell: (registration) => (
                <div className="min-w-0">
                    <div className="truncate font-semibold">
                        {registration.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                        <Mail className="size-3.5 shrink-0" />
                        {registration.email}
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            label: 'Status',
            cell: (registration) => (
                <Badge
                    className="border-warning/30 bg-warning/10 text-warning"
                    variant="outline"
                >
                    <span className="size-1.5 rounded-full bg-current" />
                    {registration.status}
                </Badge>
            ),
        },
        {
            key: 'submitted',
            header: 'Submitted',
            label: 'Submitted',
            cell: (registration) => (
                <div className="flex items-center gap-2 text-sm whitespace-nowrap text-muted-foreground">
                    <Clock3 className="size-3.5" />
                    {registration.createdAt
                        ? new Date(registration.createdAt).toLocaleDateString()
                        : '—'}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            hideable: false,
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (registration) => (
                <TableActions label={`Actions for ${registration.name}`}>
                    <TableActionLink
                        href={`/access/users/registrations/${registration.id}`}
                    >
                        <Pencil />
                        Review
                    </TableActionLink>
                </TableActions>
            ),
        },
    ];
}

type UserTableOptions = {
    filters: UserTableFilters;
    canEdit: boolean;
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
    filters,
    canEdit,
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
            hideable: false,
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
            hideable: false,
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_user, index) => firstUserNumber + index,
        },
        {
            key: 'user',
            label: 'User',
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
                        <AvatarImage src={user.avatar ?? undefined} alt="" />
                        <AvatarFallback className="rounded-lg bg-link/10 text-xs font-semibold text-link">
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
            label: 'Status',
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
            label: 'Role',
            cell: (user) => (
                <Badge variant="secondary">
                    {user.role?.displayName ?? 'No role assigned'}
                </Badge>
            ),
        },
        {
            key: 'created',
            label: 'Created',
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
            hideable: false,
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (user) => (
                <TableActions label={`Actions for ${user.name}`}>
                    <TableActionLink href={showUser.url(user.id)}>
                        <Eye />
                        View
                    </TableActionLink>
                    {canEdit && (
                        <TableActionLink href={editUser.url(user.id)}>
                            <Pencil />
                            Edit
                        </TableActionLink>
                    )}
                    {user.canDelete && (
                        <TableActionForm
                            action={deleteUser.url(user.id)}
                            method="delete"
                            destructive
                            confirmation={{
                                title: `Delete ${user.name}?`,
                                description:
                                    'This account will be removed from active users and all active sessions will be signed out.',
                                confirmLabel: 'Delete',
                            }}
                        >
                            <Trash2 />
                            Delete
                        </TableActionForm>
                    )}
                    {user.status === 'active'
                        ? canSuspend && (
                              <TableActionForm
                                  action={`/access/users/${user.id}/suspend`}
                                  method="patch"
                                  destructive
                                  confirmation={{
                                      title: `Block ${user.name}?`,
                                      description:
                                          'This account will lose access immediately. You can unblock it later from the user table.',
                                      confirmLabel: 'Block',
                                  }}
                              >
                                  <ShieldOff />
                                  Block
                              </TableActionForm>
                          )
                        : canReactivate && (
                              <TableActionForm
                                  action={`/access/users/${user.id}/reactivate`}
                                  method="patch"
                              >
                                  <ShieldCheck />
                                  Unblock
                              </TableActionForm>
                          )}
                </TableActions>
            ),
        },
    ];
}
