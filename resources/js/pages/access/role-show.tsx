import { KeyRound, Pencil, ShieldCheck, Trash2, Users } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import {
    DetailField,
    DetailsActionForm,
    DetailsPage,
    DetailsSection,
} from '@/components/details-page';
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
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
                <DetailsSection
                    title="Role definition"
                    description="The identity and scope of this access profile."
                >
                    <div className="space-y-6 p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <ShieldCheck className="size-5" />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-semibold">
                                        {role.displayName}
                                    </h2>
                                    <Badge
                                        variant={
                                            role.isSystem
                                                ? 'secondary'
                                                : 'outline'
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
                        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                            <DetailField
                                label="Description"
                                className="sm:col-span-2"
                            >
                                {role.description ?? 'No description provided.'}
                            </DetailField>
                            <DetailField label="Permissions">
                                <span className="flex items-center gap-2">
                                    <KeyRound className="size-3.5 text-muted-foreground" />
                                    {role.permissionsCount === 0
                                        ? 'Managed by policy'
                                        : role.permissionsCount}
                                </span>
                            </DetailField>
                            <DetailField label="Assigned accounts">
                                <span className="flex items-center gap-2">
                                    <Users className="size-3.5 text-muted-foreground" />
                                    {role.usersCount}
                                </span>
                            </DetailField>
                        </dl>
                    </div>
                </DetailsSection>

                <DetailsSection
                    title="Permissions"
                    description="Capabilities granted by this role."
                >
                    <div className="flex flex-wrap gap-2 p-4 sm:p-6">
                        {role.permissions.length > 0 ? (
                            role.permissions.map((permission) => (
                                <Badge key={permission} variant="secondary">
                                    {permission}
                                </Badge>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                This role uses policy-managed access.
                            </p>
                        )}
                    </div>
                </DetailsSection>
            </div>

            <DetailsSection
                title="Assigned accounts"
                description="Accounts currently using this role."
            >
                {role.users.length > 0 ? (
                    <div className="divide-y divide-border">
                        {role.users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 px-4 py-3 sm:px-6"
                            >
                                <Avatar className="size-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
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
                    <p className="p-6 text-sm text-muted-foreground">
                        No accounts are assigned to this role.
                    </p>
                )}
            </DetailsSection>
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
