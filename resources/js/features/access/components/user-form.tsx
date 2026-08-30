import { Form } from '@inertiajs/react';
import {
    ImagePlus,
    KeyRound,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActionLink } from '@/components/action-link';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type UserRoleOption = {
    id: number;
    name: string;
    display_name: string;
    is_system: boolean;
};

export type EditableUser = {
    id?: number;
    name: string;
    email: string;
    position: string | null;
    department: string | null;
    avatar: string | null;
    blocked: boolean;
    roleId: number | null;
};

type UserFormProps = {
    action: string;
    method: 'post' | 'patch';
    roles: UserRoleOption[];
    user?: EditableUser;
    submitLabel: string;
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

function SectionHeading({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-link/10 text-link">
                {icon}
            </span>
            <div className="min-w-0">
                <h2 className="text-base leading-none font-semibold">
                    {title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

export default function UserForm({
    action,
    method,
    roles,
    user,
    submitLabel,
}: UserFormProps) {
    const [blocked, setBlocked] = useState(user?.blocked ?? false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        user?.avatar ?? null,
    );
    const [removePhoto, setRemovePhoto] = useState(false);

    useEffect(() => {
        return () => {
            if (photoPreview?.startsWith('blob:')) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [photoPreview]);

    return (
        <div className="w-full">
            <Form action={action} method={method} className="space-y-6">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <SectionHeading
                                            icon={
                                                <UserRound className="size-4" />
                                            }
                                            title="Basic information"
                                            description="The identity details teammates see throughout FieldOps."
                                        />
                                    </CardHeader>
                                    <CardContent className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-name">
                                                Full name
                                            </Label>
                                            <Input
                                                id="user-name"
                                                name="name"
                                                required
                                                autoComplete="name"
                                                defaultValue={user?.name ?? ''}
                                                placeholder="Alex Morgan"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-email">
                                                Email address
                                            </Label>
                                            <Input
                                                id="user-email"
                                                name="email"
                                                type="email"
                                                required
                                                autoComplete="email"
                                                defaultValue={user?.email ?? ''}
                                                placeholder="alex@company.com"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-position">
                                                Position
                                            </Label>
                                            <Input
                                                id="user-position"
                                                name="position"
                                                defaultValue={
                                                    user?.position ?? ''
                                                }
                                                placeholder="Field supervisor"
                                            />
                                            <InputError
                                                message={errors.position}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-department">
                                                Department
                                            </Label>
                                            <Input
                                                id="user-department"
                                                name="department"
                                                defaultValue={
                                                    user?.department ?? ''
                                                }
                                                placeholder="Operations"
                                            />
                                            <InputError
                                                message={errors.department}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <SectionHeading
                                            icon={
                                                <ShieldCheck className="size-4" />
                                            }
                                            title="Access and role"
                                            description="Choose what this account can do and whether it can sign in."
                                        />
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-role">
                                                Role
                                            </Label>
                                            <select
                                                id="user-role"
                                                name="role_id"
                                                required
                                                defaultValue={
                                                    user?.roleId ?? ''
                                                }
                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            >
                                                <option value="">
                                                    Choose a role
                                                </option>
                                                {roles.map((role) => (
                                                    <option
                                                        key={role.id}
                                                        value={role.id}
                                                    >
                                                        {role.display_name}
                                                    </option>
                                                ))}
                                            </select>
                                            <InputError
                                                message={errors.role_id}
                                            />
                                        </div>

                                        <div className="rounded-xl border border-border bg-muted/20 p-4">
                                            <div className="flex items-start gap-3">
                                                <Checkbox
                                                    id="user-blocked"
                                                    className="mt-0.5"
                                                    checked={blocked}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        setBlocked(
                                                            checked === true,
                                                        )
                                                    }
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <Label
                                                        htmlFor="user-blocked"
                                                        className="block cursor-pointer leading-5"
                                                    >
                                                        Block sign-in access
                                                    </Label>
                                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                        Keep the account and its
                                                        data, but prevent login
                                                        until it is reactivated.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-center gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                                                <span
                                                    className={`size-2 rounded-full ${blocked ? 'bg-destructive' : 'bg-success'}`}
                                                />
                                                <span>
                                                    {blocked
                                                        ? 'Currently blocked'
                                                        : 'Currently active'}
                                                </span>
                                            </div>
                                            <input
                                                type="hidden"
                                                name="blocked"
                                                value={blocked ? '1' : '0'}
                                            />
                                        </div>
                                        <InputError message={errors.blocked} />
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <SectionHeading
                                            icon={
                                                <ImagePlus className="size-4" />
                                            }
                                            title="Profile photo"
                                            description="Use a clear photo or keep the initials fallback."
                                        />
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="size-16 shrink-0 rounded-xl">
                                                <AvatarImage
                                                    src={
                                                        removePhoto
                                                            ? undefined
                                                            : (photoPreview ??
                                                              undefined)
                                                    }
                                                    alt=""
                                                />
                                                <AvatarFallback className="rounded-xl bg-link/10 text-lg font-semibold text-link">
                                                    {initials(
                                                        user?.name ??
                                                            'New User',
                                                    )}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium">
                                                    Avatar preview
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    JPG, PNG, or WebP up to 5 MB
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-photo">
                                                Upload photo
                                            </Label>
                                            <Input
                                                id="user-photo"
                                                name="photo"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(event) => {
                                                    const file =
                                                        event.target.files?.[0];

                                                    if (!file) {
                                                        return;
                                                    }

                                                    setRemovePhoto(false);
                                                    setPhotoPreview(
                                                        URL.createObjectURL(
                                                            file,
                                                        ),
                                                    );
                                                }}
                                            />
                                            <InputError
                                                message={errors.photo}
                                            />
                                        </div>
                                        {user?.avatar && (
                                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                                {removePhoto ? (
                                                    <button
                                                        type="button"
                                                        className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                        onClick={() => {
                                                            setRemovePhoto(
                                                                false,
                                                            );
                                                            setPhotoPreview(
                                                                user.avatar,
                                                            );
                                                        }}
                                                    >
                                                        Keep current photo
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="inline-flex items-center gap-2 text-destructive underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                        onClick={() => {
                                                            setRemovePhoto(
                                                                true,
                                                            );
                                                            setPhotoPreview(
                                                                null,
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                        Remove current photo
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <input
                                            type="hidden"
                                            name="remove_photo"
                                            value={removePhoto ? '1' : '0'}
                                        />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <SectionHeading
                                            icon={
                                                <KeyRound className="size-4" />
                                            }
                                            title={
                                                user
                                                    ? 'Password reset'
                                                    : 'Initial password'
                                            }
                                            description={
                                                user
                                                    ? 'Optional. Leave blank to keep the current password.'
                                                    : 'Set the password this user will use to sign in.'
                                            }
                                        />
                                    </CardHeader>
                                    <CardContent className="grid gap-5">
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-password">
                                                Password
                                            </Label>
                                            <PasswordInput
                                                id="user-password"
                                                name="password"
                                                required={!user}
                                                autoComplete="new-password"
                                                placeholder="Password"
                                            />
                                            <InputError
                                                message={errors.password}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="user-password-confirmation">
                                                Confirm password
                                            </Label>
                                            <PasswordInput
                                                id="user-password-confirmation"
                                                name="password_confirmation"
                                                required={!user}
                                                autoComplete="new-password"
                                                placeholder="Repeat password"
                                            />
                                            <InputError
                                                message={
                                                    errors.password_confirmation
                                                }
                                            />
                                        </div>
                                        <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                                            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-link" />
                                            <p>
                                                Password values are never shown
                                                in the audit history. Changing
                                                this password signs the user out
                                                of active sessions.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-link" />
                                <p>
                                    Changes require password confirmation and
                                    are recorded in the access audit history.
                                </p>
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                <ActionLink
                                    href="/access/users"
                                    variant="ghost"
                                >
                                    Cancel
                                </ActionLink>
                                <Button disabled={processing} type="submit">
                                    {submitLabel}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}
