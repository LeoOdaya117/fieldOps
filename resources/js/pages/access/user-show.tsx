import {
    CalendarDays,
    Mail,
    Pencil,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserRound,
} from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import {
    DetailField,
    DetailsActionForm,
    DetailsPage,
    DetailsSection,
} from '@/components/details-page';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';
import {
    edit as editUser,
    index as usersIndex,
    reactivate as reactivateUser,
    suspend as suspendUser,
    destroy as deleteUser,
} from '@/routes/access/users';

type UserDetails = {
    id: number;
    name: string;
    email: string;
    position: string | null;
    department: string | null;
    avatar: string | null;
    status: 'active' | 'suspended';
    role: { id: number; name: string; displayName: string } | null;
    emailVerifiedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
};

function initials(name: string): string {
    return name
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleString() : 'Not recorded';
}

function UserStatus({ status }: { status: UserDetails['status'] }) {
    const blocked = status === 'suspended';

    return (
        <Badge
            variant="outline"
            className={
                blocked
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-success/30 bg-success/10 text-success'
            }
        >
            <span className="size-1.5 rounded-full bg-current" />
            {blocked ? 'Blocked' : 'Active'}
        </Badge>
    );
}

export default function UserShowPage({
    user,
    canEdit,
    canDelete = false,
    canSuspend = false,
    canReactivate = false,
}: {
    user: UserDetails;
    canEdit?: boolean;
    canDelete?: boolean;
    canSuspend?: boolean;
    canReactivate?: boolean;
}) {
    return (
        <DetailsPage
            title={user.name}
            description="Review the account identity, access status, and profile details."
            backHref={usersIndex.url()}
            backLabel="Back to users"
            actions={
                <>
                    {canEdit ? (
                        <ActionLink href={editUser.url(user.id)}>
                            <Pencil />
                            Edit
                        </ActionLink>
                    ) : null}
                    {canDelete ? (
                        <DetailsActionForm
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
                        </DetailsActionForm>
                    ) : null}
                    {user.status === 'active'
                        ? canSuspend && (
                              <DetailsActionForm
                                  action={suspendUser.url(user.id)}
                                  method="patch"
                                  destructive
                                  confirmation={{
                                      title: `Block ${user.name}?`,
                                      description:
                                          'This account will lose access immediately. You can unblock it later.',
                                      confirmLabel: 'Block',
                                  }}
                              >
                                  <ShieldAlert />
                                  Block
                              </DetailsActionForm>
                          )
                        : canReactivate && (
                              <DetailsActionForm
                                  action={reactivateUser.url(user.id)}
                                  method="patch"
                                  variant="outline"
                                  confirmation={{
                                      title: `Unblock ${user.name}?`,
                                      description:
                                          'This account will be allowed to authenticate again.',
                                      confirmLabel: 'Unblock',
                                  }}
                              >
                                  <ShieldCheck />
                                  Unblock
                              </DetailsActionForm>
                          )}
                </>
            }
        >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
                <DetailsSection
                    title="Profile details"
                    description="The identity information shown to the workspace."
                >
                    <div className="space-y-6 p-4 sm:p-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="size-14 rounded-2xl">
                                <AvatarImage
                                    src={user.avatar ?? undefined}
                                    alt=""
                                />
                                <AvatarFallback className="rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                                    {initials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-semibold">
                                    {user.name}
                                </h2>
                                <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                                    <Mail className="size-3.5 shrink-0" />
                                    {user.email}
                                </p>
                            </div>
                        </div>
                        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                            <DetailField label="Position">
                                {user.position ?? 'Not recorded'}
                            </DetailField>
                            <DetailField label="Department">
                                {user.department ?? 'Not recorded'}
                            </DetailField>
                            <DetailField label="Email verification">
                                {user.emailVerifiedAt
                                    ? `Verified ${formatDate(user.emailVerifiedAt)}`
                                    : 'Not verified'}
                            </DetailField>
                            <DetailField label="Account created">
                                {formatDate(user.createdAt)}
                            </DetailField>
                        </dl>
                    </div>
                </DetailsSection>

                <DetailsSection
                    title="Access"
                    description="Current access state and assigned workspace role."
                >
                    <dl className="grid gap-5 p-4 sm:p-6">
                        <DetailField label="Status">
                            <UserStatus status={user.status} />
                        </DetailField>
                        <DetailField label="Role">
                            {user.role ? (
                                <div>
                                    <p className="font-medium">
                                        {user.role.displayName}
                                    </p>
                                    <code className="mt-1 block font-mono text-xs text-muted-foreground">
                                        {user.role.name}
                                    </code>
                                </div>
                            ) : (
                                'No role assigned'
                            )}
                        </DetailField>
                        <DetailField label="Last profile update">
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <CalendarDays className="size-3.5" />
                                {formatDate(user.updatedAt)}
                            </span>
                        </DetailField>
                        <DetailField label="Account identifier">
                            <span className="flex items-center gap-2 text-muted-foreground">
                                <UserRound className="size-3.5" />#{user.id}
                            </span>
                        </DetailField>
                    </dl>
                </DetailsSection>
            </div>
        </DetailsPage>
    );
}

UserShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
        { title: 'User details', href: usersIndex() },
    ],
};
