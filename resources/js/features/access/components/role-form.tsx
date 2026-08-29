import { Form } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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

function selectionState(names: string[], selectedPermissions: Set<string>) {
    const selectedCount = names.filter((name) =>
        selectedPermissions.has(name),
    ).length;

    return {
        checked: names.length > 0 && selectedCount === names.length,
        indeterminate: selectedCount > 0 && selectedCount < names.length,
    };
}

export default function RoleForm({
    action,
    method,
    permissions = [],
    role,
    submitLabel,
}: RoleFormProps) {
    const groupedPermissions = permissionGroups(permissions);
    const [openPermissionGroup, setOpenPermissionGroup] = useState<
        string | null
    >(groupedPermissions[0]?.key ?? null);
    const allPermissionNames = groupedPermissions.flatMap((group) =>
        group.permissions.map((permission) => permission.name),
    );
    const availablePermissionNames = new Set(allPermissionNames);
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
        () =>
            new Set(
                (role?.permissions ?? []).filter((permission) =>
                    availablePermissionNames.has(permission),
                ),
            ),
    );
    const selectedPermissionCount = allPermissionNames.filter((name) =>
        selectedPermissions.has(name),
    ).length;
    const allPermissions = selectionState(
        allPermissionNames,
        selectedPermissions,
    );
    const permissionGroupsWithSelection = groupedPermissions.map((group) => {
        const permissionNames = group.permissions.map(
            (permission) => permission.name,
        );

        return {
            ...group,
            permissionNames,
            selection: selectionState(permissionNames, selectedPermissions),
        };
    });

    function setPermissionsSelected(names: string[], selected: boolean) {
        setSelectedPermissions((current) => {
            const next = new Set(current);

            names.forEach((name) => {
                if (selected) {
                    next.add(name);
                } else {
                    next.delete(name);
                }
            });

            return next;
        });
    }

    return (
        <Card className="w-full">
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
                            <div
                                data-slot="role-details-fields"
                                className="grid items-start gap-5 md:grid-cols-2"
                            >
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
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <legend className="text-sm font-medium">
                                            Permissions
                                        </legend>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Select the actions members of this
                                            role can perform.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {selectedPermissionCount} of{' '}
                                            {allPermissionNames.length} selected
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="select-all-permissions"
                                                aria-label="Select all permissions"
                                                disabled={
                                                    allPermissionNames.length ===
                                                    0
                                                }
                                                checked={
                                                    allPermissions.indeterminate
                                                        ? 'indeterminate'
                                                        : allPermissions.checked
                                                }
                                                onCheckedChange={(checked) =>
                                                    setPermissionsSelected(
                                                        allPermissionNames,
                                                        checked === true,
                                                    )
                                                }
                                            />
                                            <Label
                                                htmlFor="select-all-permissions"
                                                className="cursor-pointer text-sm text-foreground"
                                            >
                                                Select all
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                                {groupedPermissions.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-border bg-muted/15 px-4 py-6 text-sm text-muted-foreground">
                                        No permissions are configured yet.
                                    </div>
                                ) : (
                                    <div
                                        data-slot="permission-groups"
                                        className="grid gap-4"
                                    >
                                        {permissionGroupsWithSelection.map(
                                            (group) => (
                                                <section
                                                    key={group.key}
                                                    aria-labelledby={`permission-group-${group.key}`}
                                                    className="overflow-hidden rounded-xl border border-border/80 bg-muted/15"
                                                >
                                                    <div className="flex items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
                                                        <button
                                                            type="button"
                                                            className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                            aria-expanded={
                                                                openPermissionGroup ===
                                                                group.key
                                                            }
                                                            aria-controls={`permission-group-content-${group.key}`}
                                                            aria-label={`${openPermissionGroup === group.key ? 'Collapse' : 'Expand'} ${group.label} permissions`}
                                                            onClick={() =>
                                                                setOpenPermissionGroup(
                                                                    (
                                                                        current,
                                                                    ) =>
                                                                        current ===
                                                                        group.key
                                                                            ? null
                                                                            : group.key,
                                                                )
                                                            }
                                                        >
                                                            <ChevronDown
                                                                aria-hidden="true"
                                                                className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${openPermissionGroup === group.key ? 'rotate-180' : ''}`}
                                                            />
                                                            <span className="min-w-0">
                                                                <h3
                                                                    id={`permission-group-${group.key}`}
                                                                    className="text-sm font-semibold text-foreground"
                                                                >
                                                                    {
                                                                        group.label
                                                                    }
                                                                </h3>
                                                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                                                    {
                                                                        group
                                                                            .permissions
                                                                            .length
                                                                    }{' '}
                                                                    {group
                                                                        .permissions
                                                                        .length ===
                                                                    1
                                                                        ? 'action'
                                                                        : 'actions'}
                                                                </span>
                                                            </span>
                                                        </button>
                                                        <div className="flex shrink-0 items-center gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <Label
                                                                    htmlFor={`select-all-${group.key}`}
                                                                    className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                                                                >
                                                                    Select all
                                                                </Label>
                                                                <Checkbox
                                                                    id={`select-all-${group.key}`}
                                                                    aria-label={`Select all ${group.label} permissions`}
                                                                    checked={
                                                                        group
                                                                            .selection
                                                                            .indeterminate
                                                                            ? 'indeterminate'
                                                                            : group
                                                                                  .selection
                                                                                  .checked
                                                                    }
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        setPermissionsSelected(
                                                                            group.permissionNames,
                                                                            checked ===
                                                                                true,
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                                                                {
                                                                    group
                                                                        .permissions
                                                                        .length
                                                                }
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div
                                                        id={`permission-group-content-${group.key}`}
                                                        hidden={
                                                            openPermissionGroup !==
                                                            group.key
                                                        }
                                                        className="grid gap-2 p-3 sm:grid-cols-2"
                                                    >
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
                                                                        checked={selectedPermissions.has(
                                                                            permission.name,
                                                                        )}
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            setPermissionsSelected(
                                                                                [
                                                                                    permission.name,
                                                                                ],
                                                                                event
                                                                                    .target
                                                                                    .checked,
                                                                            )
                                                                        }
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
                                            ),
                                        )}
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
