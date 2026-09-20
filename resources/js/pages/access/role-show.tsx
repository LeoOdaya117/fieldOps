import { KeyRound, Pencil, ShieldCheck, Trash2, Users } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { DetailsActionForm, DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';
import {
    destroy as deleteRole,
    edit as editRole,
    index as rolesIndex,
} from '@/routes/access/roles';

type RoleDetails = {
    id: number;
    name: string;
    displayName: string;
    description: string | null;
    isSystem: boolean;
    usersCount: number;
    permissionsCount: number;
    permissions: string[];
    users: { id: number; name: string; email: string }[];
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

export default function RoleShowPage({
    role,
    canEdit,
    canDelete = false,
}: {
    role: RoleDetails;
    canEdit?: boolean;
    canDelete?: boolean;
}) {
    return (
        <DetailsPage
            title={role.displayName}
            description="Review the role definition, permission scope, and assigned accounts."
            backHref={rolesIndex.url()}
            backLabel="Back to roles"
            actions={
                <>
                    {canEdit ? (
                        <ActionLink href={editRole.url(role.id)}>
                            <Pencil />
                            Edit
                        </ActionLink>
                    ) : null}
                    {canDelete ? (
                        <DetailsActionForm
                            action={deleteRole.url(role.id)}
                            method="delete"
                            destructive
                            confirmation={{
                                title: `Delete ${role.displayName}?`,
                                description:
                                    'This will archive the role and remove it from active role lists.',
                                confirmLabel: 'Delete',
                            }}
                        >
                            <Trash2 />
                            Delete
                        </DetailsActionForm>
                    ) : null}
                </>
            }
        >
            <DetailsView
                record={role}
                summary={
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-link/10 text-link">
                            <ShieldCheck className="size-5" />
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold">
                                    {role.displayName}
                                </h2>
                                <Badge
                                    variant={
                                        role.isSystem ? 'secondary' : 'outline'
                                    }
                                >
                                    {role.isSystem ? 'System' : 'Custom'}
                                </Badge>
                            </div>
                            <code className="mt-1 block font-mono text-xs text-muted-foreground">
                                {role.name}
                            </code>
                        </div>
                    </div>
                }
                sections={[
                    {
                        key: 'definition',
                        title: 'Role definition',
                        description:
                            'The identity and scope of this access profile.',
                        columns: [
                            {
                                key: 'description',
                                label: 'Description',
                                cell: (record) =>
                                    record.description ??
                                    'No description provided.',
                                span: 'full',
                            },
                            {
                                key: 'permissionsCount',
                                label: 'Permissions',
                                cell: (record) => (
                                    <span className="flex items-center gap-2">
                                        <KeyRound className="size-3.5 text-muted-foreground" />
                                        {record.permissionsCount === 0
                                            ? 'Managed by policy'
                                            : record.permissionsCount}
                                    </span>
                                ),
                                span: 1,
                            },
                            {
                                key: 'usersCount',
                                label: 'Assigned accounts',
                                cell: (record) => (
                                    <span className="flex items-center gap-2">
                                        <Users className="size-3.5 text-muted-foreground" />
                                        {record.usersCount}
                                    </span>
                                ),
                                span: 1,
                            },
                        ],
                    },
                    {
                        key: 'permissions',
                        title: 'Permissions',
                        description: 'Capabilities granted by this role.',
                        content: (record) =>
                            record.permissions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {record.permissions.map((permission) => (
                                        <Badge
                                            key={permission}
                                            variant="secondary"
                                        >
                                            {permission}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    This role uses policy-managed access.
                                </p>
                            ),
                    },
                    {
                        key: 'users',
                        title: 'Assigned accounts',
                        description: 'Accounts currently using this role.',
                        content: (record) =>
                            record.users.length > 0 ? (
                                <div className="divide-y divide-border rounded-lg border border-border/70">
                                    {record.users.map((user) => (
                                        <div
                                            key={user.id}
                                            className="flex items-center gap-3 px-3 py-3 first:pt-3 last:pb-3 sm:px-4"
                                        >
                                            <Avatar className="size-8 rounded-lg">
                                                <AvatarFallback className="rounded-lg bg-link/10 text-[11px] font-semibold text-link">
                                                    {initials(user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {user.name}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    No accounts are assigned to this role.
                                </p>
                            ),
                    },
                ]}
            />
        </DetailsPage>
    );
}

RoleShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Roles', href: rolesIndex() },
        { title: 'Role details', href: rolesIndex() },
    ],
};
