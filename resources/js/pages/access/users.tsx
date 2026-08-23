import { Head } from '@inertiajs/react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { Badge } from '@/components/ui/badge';
import { BulkActionForm, BulkActions } from '@/components/ui/bulk-actions';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TablePagination } from '@/components/ui/table-pagination';
import {
    invitationTableColumns as invitationTableColumnsModel,
    userTableColumns as userTableColumnsModel,
} from '@/features/access/user-table-model';
import type {
    Invitation,
    RoleOption,
    UserTableFilters,
    UserRow,
} from '@/features/access/user-table-model';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

type PaginatedUsers = {
    data: UserRow[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links?: { url: string | null; label: string; active: boolean }[];
};

type UsersPageProps = {
    users: PaginatedUsers;
    invitations: Invitation[];
    roles: RoleOption[];
    canInvite?: boolean;
    canSuspend?: boolean;
    canReactivate?: boolean;
    filters: UserTableFilters;
};

export default function UsersPage({
    users,
    invitations,
    roles,
    canInvite = true,
    canSuspend = true,
    canReactivate = true,
    filters,
}: UsersPageProps) {
    const previousUrl = users.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = users.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const visibleUserIds = users.data.map((user) => user.id);
    const allUsersSelected =
        visibleUserIds.length > 0 &&
        visibleUserIds.every((id) => selectedUserIds.includes(id));
    const someUsersSelected = selectedUserIds.length > 0 && !allUsersSelected;
    const firstUserNumber = users.from ?? 1;

    const toggleUser = (id: number, selected: boolean) => {
        setSelectedUserIds((current) => {
            if (selected) {
                return current.includes(id) ? current : [...current, id];
            }

            return current.filter((selectedId) => selectedId !== id);
        });
    };

    const toggleAllUsers = (selected: boolean) => {
        setSelectedUserIds(selected ? visibleUserIds : []);
    };

    const invitationTableColumns = () => invitationTableColumnsModel();
    const userTableColumns = () =>
        userTableColumnsModel({
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
        });

    return (
        <>
            <Head title="Users" />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Users"
                        description="Invite people, assign one role, and control account access."
                    />
                    <div className="flex flex-wrap gap-2">
                        <SearchFilterSheet
                            action="/access/users"
                            resetHref="/access/users"
                            title="Search and filter users"
                            description="Find users by name or email and narrow the list by account status."
                            activeFilterCount={
                                [filters.search, filters.status].filter(Boolean)
                                    .length
                            }
                        >
                            <div className="grid gap-2">
                                <label
                                    htmlFor="user-search"
                                    className="text-sm font-medium"
                                >
                                    Search users
                                </label>
                                <Input
                                    id="user-search"
                                    name="search"
                                    defaultValue={filters.search}
                                    placeholder="Name or email"
                                    autoFocus
                                />
                            </div>
                            <div className="grid gap-2">
                                <label
                                    htmlFor="user-status"
                                    className="text-sm font-medium"
                                >
                                    Account status
                                </label>
                                <select
                                    id="user-status"
                                    name="status"
                                    defaultValue={filters.status}
                                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                >
                                    <option value="">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </SearchFilterSheet>
                        {canInvite && (
                            <ActionLink href="/access/users/create">
                                <Plus />
                                Invite user
                            </ActionLink>
                        )}
                    </div>
                </div>

                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="border-b border-border py-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <CardTitle>Pending invitations</CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Invitations expire automatically and can be
                                    resent or revoked.
                                </p>
                            </div>
                            <Badge variant="outline">
                                {invitations.length} pending
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {invitations.length === 0 ? (
                            <p className="px-6 py-10 text-sm text-muted-foreground">
                                No pending invitations.
                            </p>
                        ) : (
                            <DataTable
                                caption="Pending user invitations"
                                className="min-w-[760px]"
                                containerClassName="rounded-none border-0 shadow-none ring-0"
                                data={invitations}
                                tableColumns={invitationTableColumns}
                                getRowKey={(invitation) => invitation.id}
                            />
                        )}
                    </CardContent>
                </Card>

                <Card className="gap-0 overflow-hidden py-0">
                    <CardHeader className="flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>User accounts</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Every account has exactly one role.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-3">
                            {(canSuspend || canReactivate) && (
                                <BulkActions
                                    selectedIds={selectedUserIds}
                                    onClear={() => setSelectedUserIds([])}
                                >
                                    {canSuspend && (
                                        <BulkActionForm
                                            action="/access/users/bulk/suspend"
                                            method="patch"
                                            ids={selectedUserIds}
                                            destructive
                                            onSubmit={(event) => {
                                                if (
                                                    !window.confirm(
                                                        `Suspend ${selectedUserIds.length} selected user(s)?`,
                                                    )
                                                ) {
                                                    event.preventDefault();
                                                }
                                            }}
                                        >
                                            <ShieldCheck />
                                            Suspend selected
                                        </BulkActionForm>
                                    )}
                                    {canReactivate && (
                                        <BulkActionForm
                                            action="/access/users/bulk/reactivate"
                                            method="patch"
                                            ids={selectedUserIds}
                                        >
                                            <ShieldCheck />
                                            Reactivate selected
                                        </BulkActionForm>
                                    )}
                                </BulkActions>
                            )}
                            <Badge variant="outline">
                                {users.total}{' '}
                                {users.total === 1 ? 'account' : 'accounts'}
                            </Badge>
                            <ActionLink
                                href="/access/roles"
                                variant="link"
                                size="sm"
                                className="px-0"
                            >
                                Manage roles
                            </ActionLink>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {users.data.length === 0 ? (
                            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                                No users found.
                            </p>
                        ) : (
                            <DataTable
                                caption="FieldOps user accounts"
                                className="min-w-[1040px]"
                                containerClassName="rounded-none border-0 shadow-none ring-0"
                                data={users.data}
                                tableColumns={userTableColumns}
                                getRowKey={(user) => user.id}
                            />
                        )}
                        <TablePagination
                            currentPage={users.current_page}
                            lastPage={users.last_page}
                            total={users.total}
                            from={users.from}
                            to={users.to}
                            itemLabel="users"
                            previousUrl={previousUrl}
                            nextUrl={nextUrl}
                        />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

UsersPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
    ],
};
