import { Form } from '@inertiajs/react';
import { ActionLink } from '@/components/action-link';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type RolePermission = {
    id: number;
    name: string;
};

export type EditableRole = {
    id?: number;
    name: string;
    displayName: string;
    description: string | null;
    permissions: string[];
};

type RoleFormProps = {
    action: string;
    method: 'post' | 'patch';
    permissions: RolePermission[];
    role?: EditableRole;
    submitLabel: string;
};

function permissionLabel(name: string): string {
    const [, ...actions] = name.split('.');

    return actions.length > 0
        ? actions.join(' · ').replace(/[-_]/g, ' ')
        : name;
}

function permissionGroup(name: string): string {
    return name.split('.')[0] ?? name;
}

function groupLabel(value: string): string {
    return value
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function permissionGroups(permissions: RolePermission[] | undefined) {
    const groups = new Map<string, RolePermission[]>();

    for (const permission of Array.isArray(permissions) ? permissions : []) {
        if (!permission || typeof permission.name !== 'string') {
            continue;
        }

        const group = permissionGroup(permission.name);
        const current = groups.get(group) ?? [];

        current.push(permission);
        groups.set(group, current);
    }

    return Array.from(groups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, groupPermissions]) => ({
            key,
            label: groupLabel(key),
            permissions: [...groupPermissions].sort((left, right) =>
                left.name.localeCompare(right.name),
            ),
        }));
}

export default function RoleForm({
    action,
    method,
    permissions = [],
    role,
    submitLabel,
}: RoleFormProps) {
    const groupedPermissions = permissionGroups(permissions);

    return (
        <Card className="max-w-4xl">
            <CardHeader>
                <CardTitle>Role details</CardTitle>
                <CardDescription>
                    Define a clear name and grant only the permissions this role
                    needs.
                </CardDescription>
            </CardHeader>
            <Form action={action} method={method} className="contents">
                {({ processing, errors }) => (
                    <>
                        <CardContent className="space-y-6">
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="role-name">Role key</Label>
                                    <Input
                                        id="role-name"
                                        name="name"
                                        placeholder="regional_manager"
                                        defaultValue={role?.name ?? ''}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use lowercase letters, numbers, dashes,
                                        or underscores.
                                    </p>
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role-display-name">
                                        Display name
                                    </Label>
                                    <Input
                                        id="role-display-name"
                                        name="display_name"
                                        placeholder="Regional manager"
                                        defaultValue={role?.displayName ?? ''}
                                        required
                                    />
                                    <InputError message={errors.display_name} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="role-description">
                                    Description
                                </Label>
                                <textarea
                                    id="role-description"
                                    name="description"
                                    rows={3}
                                    defaultValue={role?.description ?? ''}
                                    placeholder="What is this role responsible for?"
                                    className="min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={errors.description} />
                            </div>

                            <fieldset className="grid gap-3">
                                <div>
                                    <legend className="text-sm font-medium">
                                        Permissions
                                    </legend>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Select the actions members of this role
                                        can perform.
                                    </p>
                                </div>
                                {groupedPermissions.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                                        No permissions are configured yet.
                                    </div>
                                ) : (
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {groupedPermissions.map((group) => (
                                            <section
                                                key={group.key}
                                                aria-labelledby={`permission-group-${group.key}`}
                                                className="overflow-hidden rounded-xl border border-border/80 bg-muted/15"
                                            >
                                                <div className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
                                                    <div>
                                                        <h3
                                                            id={`permission-group-${group.key}`}
                                                            className="text-sm font-semibold text-foreground"
                                                        >
                                                            {group.label}
                                                        </h3>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {
                                                                group
                                                                    .permissions
                                                                    .length
                                                            }{' '}
                                                            {group.permissions
                                                                .length === 1
                                                                ? 'action'
                                                                : 'actions'}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                                                        {
                                                            group.permissions
                                                                .length
                                                        }
                                                    </span>
                                                </div>
                                                <div className="grid gap-2 p-3 sm:grid-cols-2">
                                                    {group.permissions.map(
                                                        (permission) => (
                                                            <label
                                                                key={
                                                                    permission.id
                                                                }
                                                                className="group flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    name="permissions[]"
                                                                    value={
                                                                        permission.name
                                                                    }
                                                                    defaultChecked={role?.permissions.includes(
                                                                        permission.name,
                                                                    )}
                                                                    className="mt-0.5 size-4 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                />
                                                                <span className="min-w-0 text-sm font-medium text-foreground">
                                                                    <span className="block capitalize">
                                                                        {permissionLabel(
                                                                            permission.name,
                                                                        )}
                                                                    </span>
                                                                    <span className="mt-0.5 block truncate font-mono text-xs font-normal text-muted-foreground">
                                                                        {
                                                                            permission.name
                                                                        }
                                                                    </span>
                                                                </span>
                                                            </label>
                                                        ),
                                                    )}
                                                </div>
                                            </section>
                                        ))}
                                    </div>
                                )}
                                <InputError message={errors.permissions} />
                            </fieldset>
                        </CardContent>
                        <CardFooter className="justify-between gap-3 border-t border-border pt-6">
                            <ActionLink href="/access/roles" variant="ghost">
                                Cancel
                            </ActionLink>
                            <Button disabled={processing} type="submit">
                                {submitLabel}
                            </Button>
                        </CardFooter>
                    </>
                )}
            </Form>
        </Card>
    );
}
