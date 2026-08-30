import { Form, Head, usePage } from '@inertiajs/react';
/* @chisel-email-verification */
import { Link } from '@inertiajs/react';
/* @end-chisel-email-verification */
import { ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import type { Auth } from '@/types';
/* @chisel-email-verification */
import { send } from '@/routes/verification';
/* @end-chisel-email-verification */

type PageProps = {
    auth: Auth;
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

export default function Profile(
    /* @chisel-email-verification */
    {
        mustVerifyEmail,
        status,
    }: {
        mustVerifyEmail: boolean;
        status?: string;
    },
    /* @end-chisel-email-verification */
) {
    const { auth } = usePage<PageProps>().props;
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        auth.user.avatar ?? null,
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
        <>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profile"
                    description="Update your contact and profile details"
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
                                <Card>
                                    <CardHeader>
                                        <h2 className="text-base font-semibold">
                                            Personal information
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            The details teammates see when they
                                            work with you.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="grid gap-5 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                defaultValue={auth.user.name}
                                                name="name"
                                                required
                                                autoComplete="name"
                                                placeholder="Full name"
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="email">
                                                Email address
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                defaultValue={auth.user.email}
                                                name="email"
                                                required
                                                autoComplete="username"
                                                placeholder="Email address"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="position">
                                                Position
                                            </Label>
                                            <Input
                                                id="position"
                                                defaultValue={
                                                    auth.user.position ?? ''
                                                }
                                                name="position"
                                                autoComplete="organization-title"
                                                placeholder="Field supervisor"
                                            />
                                            <InputError
                                                message={errors.position}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="department">
                                                Department
                                            </Label>
                                            <Input
                                                id="department"
                                                defaultValue={
                                                    auth.user.department ?? ''
                                                }
                                                name="department"
                                                autoComplete="organization"
                                                placeholder="Operations"
                                            />
                                            <InputError
                                                message={errors.department}
                                            />
                                        </div>

                                        {/* @chisel-email-verification */}
                                        {mustVerifyEmail &&
                                            auth.user.email_verified_at ===
                                                null && (
                                                <div className="border-t border-border/70 pt-4 sm:col-span-2">
                                                    <p className="text-sm text-muted-foreground">
                                                        Your email address is
                                                        unverified.{' '}
                                                        <Link
                                                            href={send()}
                                                            as="button"
                                                            className="text-foreground underline decoration-border underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current"
                                                        >
                                                            Click here to
                                                            re-send the
                                                            verification email.
                                                        </Link>
                                                    </p>

                                                    {status ===
                                                        'verification-link-sent' && (
                                                        <div className="mt-2 text-sm font-medium text-success">
                                                            A new verification
                                                            link has been sent
                                                            to your email
                                                            address.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        {/* @end-chisel-email-verification */}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-start gap-3">
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-link/10 text-link">
                                                <ImagePlus className="size-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <h2 className="text-base font-semibold">
                                                    Profile photo
                                                </h2>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Use a clear photo or keep
                                                    your initials.
                                                </p>
                                            </div>
                                        </div>
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
                                                    alt={`${auth.user.name} profile photo`}
                                                />
                                                <AvatarFallback className="rounded-xl bg-link/10 text-lg font-semibold text-link">
                                                    {initials(auth.user.name)}
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
                                            <Label htmlFor="photo">
                                                Upload photo
                                            </Label>
                                            <Input
                                                id="photo"
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

                                        {auth.user.avatar && (
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
                                                                auth.user
                                                                    .avatar ??
                                                                    null,
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
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    Save
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
