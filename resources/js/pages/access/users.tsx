import {
    ClipboardList,
    Plus,
    Send,
    ShieldCheck,
    UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ActionLink } from '@/components/action-link';
import { AuditFilterFields } from '@/components/audit-filter-fields';
import { IndexPage, IndexPageSection } from '@/components/index-page';
import SearchFilterSheet from '@/components/search-filter-sheet';
import { BulkActionForm, BulkActions } from '@/components/ui/bulk-actions';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { Input } from '@/components/ui/input';
import { DEFAULT_PAGE_SIZE } from '@/components/ui/page-size-select';
import {
    invitationTableColumns as invitationTableColumnsModel,
    userTableColumns as userTableColumnsModel,
} from '@/features/access/user-table-model';
import type {
    Invitation,
    InvitationTableFilters,
    RoleOption,
    Registration,
    UserTableFilters,
    UserRow,
} from '@/features/access/user-table-model';
import { auditFilterCount, auditFilterQuery } from '@/types/audit';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

type PaginatedUsers = {
    data: UserRow[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    per_page?: number;
    links?: { url: string | null; label: string; active: boolean }[];
};

type UsersPageProps = {
    users: PaginatedUsers;
    invitations: Invitation[];
    registrations?: Registration[];
    roles: RoleOption[];
    activeUsersCount?: number;
    canCreate?: boolean;
    canInvite?: boolean;
    canReviewRegistrations?: boolean;
    canEdit?: boolean;
    canSuspend?: boolean;
    canReactivate?: boolean;
    filters: UserTableFilters;
    invitationFilters?: InvitationTableFilters;
};

function StatCard({
    title,
    value,
    unit,
    caption,
    icon,
    action,
}: {
    title: string;
    value: number;
    unit: string;
    caption: string;
    icon: ReactNode;
    action?: ReactNode;
}) {
    return (
        <Card className="h-full gap-0 py-0">
            <CardContent className="flex min-h-24 items-center gap-3 p-3 sm:p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-link/10 text-link">
                    {icon}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-muted-foreground">
                            {title}
                        </p>
                        {action ? (
                            <div className="shrink-0">{action}</div>
                        ) : null}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span
                            role="status"
                            aria-label={`${value} ${title.toLowerCase()}`}
                            className="text-2xl leading-none font-semibold tracking-tight tabular-nums"
                        >
                            {value}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {unit}
                        </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {caption}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function UsersPage({
    users,
    invitations,
    registrations = [],
    canCreate = true,
    canInvite = true,
    canReviewRegistrations = false,
    activeUsersCount = 0,
    canEdit = true,
    canSuspend = true,
    canReactivate = true,
    filters,
    invitationFilters = { search: '', status: '' },
}: UsersPageProps) {
    const previousUrl = users.links?.find((link) =>
        link.label.includes('Previous'),
    )?.url;
    const nextUrl = users.links?.find((link) =>
        link.label.includes('Next'),
    )?.url;
    const pageSize = users.per_page ?? filters.perPage ?? DEFAULT_PAGE_SIZE;
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
        });

    const invitationTableActions = (
        <SearchFilterSheet
            action="/access/users"
            resetHref="/access/users"
            title="Search and filter invitations"
            description="Find pending invitations and narrow them by their audit metadata."
            activeFilterCount={
                [invitationFilters.search, invitationFilters.status].filter(
                    Boolean,
                ).length + auditFilterCount(invitationFilters)
            }
            pageSize={pageSize}
            keyword={
                <div className="grid gap-2">
                    <label
                        htmlFor="invitation-search"
                        className="text-sm font-medium"
                    >
                        Search invitations
                    </label>
                    <Input
                        id="invitation-search"
                        name="invitation_search"
                        defaultValue={invitationFilters.search}
                        placeholder="Email or role"
                    />
                </div>
            }
        >
            <AuditFilterFields
                filters={invitationFilters}
                idPrefix="invitation"
                namePrefix="invitation_"
            />
            <div className="grid gap-2">
                <label
                    htmlFor="invitation-status"
                    className="text-sm font-medium"
                >
                    Status
                </label>
                <AdaptiveSelect
                    id="invitation-status"
                    name="invitation_status"
                    multiple
                    defaultValue={invitationFilters.status}
                    placeholder="All statuses"
                    options={[
                        { value: '', label: 'All statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                    ]}
                />
            </div>
        </SearchFilterSheet>
    );

    const tableActions = (
        <>
            <SearchFilterSheet
                action="/access/users"
                resetHref="/access/users"
                title="Search and filter users"
                description="Find users by name or email and narrow the list by account status."
                activeFilterCount={
                    [filters.search, filters.status].filter(Boolean).length +
                    auditFilterCount(filters)
                }
                pageSize={pageSize}
                keyword={
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
                }
            >
                <AuditFilterFields filters={filters} idPrefix="user" />
                <div className="grid gap-2">
                    <label
                        htmlFor="user-status"
                        className="text-sm font-medium"
                    >
                        Account status
                    </label>
                    <AdaptiveSelect
                        id="user-status"
                        name="status"
                        multiple
                        defaultValue={filters.status}
                        placeholder="All statuses"
                        options={[
                            { value: '', label: 'All statuses' },
                            { value: 'active', label: 'Active' },
                            { value: 'suspended', label: 'Blocked' },
                        ]}
                    />
                </div>
            </SearchFilterSheet>
            {canCreate && (
                <ActionLink href="/access/users/create">
                    <Plus />
                    Add user
                </ActionLink>
            )}
            {canInvite && (
                <ActionLink href="/access/users/invite" variant="outline">
                    <Send />
                    Invite user
                </ActionLink>
            )}
            <ActionLink href="/access/roles" variant="outline">
                Manage roles
            </ActionLink>
        </>
    );

    return (
        <IndexPage
            title="Users"
            description="Invite people, assign one role, and control account access."
        >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title="Active users"
                    value={activeUsersCount}
                    unit="active"
                    caption="Can access FieldOps"
                    icon={<UsersRound className="size-4" />}
                />
                {canReviewRegistrations && (
                    <StatCard
                        title="Pending registrations"
                        value={registrations.length}
                        unit="pending"
                        caption="Awaiting administrator review"
                        icon={<ClipboardList className="size-4" />}
                        action={
                            <ActionLink
                                href="/access/users/registrations"
                                variant="link"
                                size="sm"
                                className="h-auto px-0 text-xs"
                            >
                                Review all
                            </ActionLink>
                        }
                    />
                )}
                <StatCard
                    title="Pending invitations"
                    value={invitations.length}
                    unit="pending"
                    caption="Awaiting acceptance"
                    icon={<Send className="size-4" />}
                />
            </div>

            {invitations.length > 0 && (
                <IndexPageSection
                    title="Pending invitations"
                    description="Invitations expire automatically and can be resent or revoked."
                >
                    <DataTable
                        caption="Pending user invitations"
                        className="min-w-max"
                        containerClassName="rounded-none border-0 shadow-none ring-0"
                        scrollContainerClassName="px-4"
                        data={invitations}
                        tableColumns={invitationTableColumns}
                        actions={invitationTableActions}
                        addDefaultColumns
                        defaultColumnSort={{
                            action: usersIndex.url(),
                            sort: invitationFilters.sort,
                            direction: invitationFilters.direction,
                            sortParam: 'invitation_sort',
                            directionParam: 'invitation_direction',
                            hidden: {
                                invitation_search: invitationFilters.search,
                                invitation_status: invitationFilters.status,
                                invitation_from: invitationFilters.from,
                                invitation_to: invitationFilters.to,
                                invitation_updated_from:
                                    invitationFilters.updatedFrom,
                                invitation_updated_to:
                                    invitationFilters.updatedTo,
                                invitation_created_by:
                                    invitationFilters.createdBy,
                                invitation_updated_by:
                                    invitationFilters.updatedBy,
                                invitation_record_status:
                                    invitationFilters.recordStatus,
                            },
                        }}
                        columnVisibility={{
                            storageKey: 'access.invitations.v2',
                            defaultVisibleKeys: [
                                'email',
                                'role',
                                'expires',
                                'created_at',
                                'updated_at',
                                'created_by',
                                'updated_by',
                                'status',
                                'record_status',
                            ],
                        }}
                        getRowKey={(invitation) => invitation.id}
                    />
                </IndexPageSection>
            )}

            <IndexPageSection
                title="User accounts"
                description="Every account has exactly one role."
            >
                <DataTable
                    caption="FieldOps user accounts"
                    className="min-w-max"
                    containerClassName="rounded-none border-0 shadow-none ring-0"
                    scrollContainerClassName="px-4"
                    data={users.data}
                    tableColumns={userTableColumns}
                    actions={tableActions}
                    emptyState={
                        <p className="text-sm text-muted-foreground">
                            No users found.
                        </p>
                    }
                    addDefaultColumns
                    excludeDefaultColumns={['created_at', 'status']}
                    defaultColumnSort={{
                        action: usersIndex.url(),
                        sort: filters.sort,
                        direction: filters.direction,
                        hidden: {
                            search: filters.search,
                            status: filters.status,
                            ...auditFilterQuery(filters),
                        },
                    }}
                    toolbar={
                        (canSuspend || canReactivate) &&
                        selectedUserIds.length > 0 ? (
                            <div
                                data-slot="bulk-actions-row"
                                className="min-w-0"
                            >
                                <BulkActions
                                    selectedIds={selectedUserIds}
                                    onClear={() => setSelectedUserIds([])}
                                    className="justify-start"
                                >
                                    {canSuspend && (
                                        <BulkActionForm
                                            action="/access/users/bulk/suspend"
                                            method="patch"
                                            ids={selectedUserIds}
                                            destructive
                                            confirmation={{
                                                title: `Block ${selectedUserIds.length} selected user(s)?`,
                                                description:
                                                    'These accounts will lose access immediately. You can unblock them later.',
                                                confirmLabel: 'Block',
                                            }}
                                            onSuccess={() =>
                                                setSelectedUserIds([])
                                            }
                                        >
                                            <ShieldCheck />
                                            Block selected
                                        </BulkActionForm>
                                    )}
                                    {canReactivate && (
                                        <BulkActionForm
                                            action="/access/users/bulk/reactivate"
                                            method="patch"
                                            ids={selectedUserIds}
                                            confirmation={{
                                                title: `Unblock ${selectedUserIds.length} selected user(s)?`,
                                                description:
                                                    'These accounts will regain access immediately.',
                                                confirmLabel: 'Unblock',
                                            }}
                                            onSuccess={() =>
                                                setSelectedUserIds([])
                                            }
                                        >
                                            <ShieldCheck />
                                            Unblock selected
                                        </BulkActionForm>
                                    )}
                                </BulkActions>
                            </div>
                        ) : null
                    }
                    columnVisibility={{
                        storageKey: 'access.users.v2',
                        defaultVisibleKeys: [
                            'user',
                            'status',
                            'role',
                            'created',
                            'updated_at',
                            'created_by',
                            'updated_by',
                            'record_status',
                        ],
                    }}
                    getRowKey={(user) => user.id}
                    pagination={{
                        currentPage: users.current_page,
                        lastPage: users.last_page,
                        total: users.total,
                        from: users.from,
                        to: users.to,
                        pageSize,
                        links: users.links,
                        itemLabel: 'users',
                        previousUrl,
                        nextUrl,
                    }}
                />
            </IndexPageSection>
        </IndexPage>
    );
}

UsersPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
    ],
};
