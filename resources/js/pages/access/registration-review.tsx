import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { UserRoleOption } from '@/features/access/components/user-form';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

type Registration = {
    id: number;
    name: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string | null;
};

export default function RegistrationReviewPage({
    registration,
    roles,
}: {
    registration: Registration;
    roles: UserRoleOption[];
}) {
    const pending = registration.status === 'pending';

    return (
        <>
            <Head title={`Review ${registration.name}`} />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink
                    href="/access/users/registrations"
                    variant="ghost"
                    size="sm"
                >
                    <ArrowLeft />
                    Back to registrations
                </ActionLink>
                <Heading
                    title={`Review ${registration.name}`}
                    description="Confirm the applicant and choose the access profile they should receive."
                />
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <CardTitle>Registration details</CardTitle>
                                    <CardDescription>
                                        Submitted{' '}
                                        {registration.createdAt
                                            ? new Date(
                                                  registration.createdAt,
                                              ).toLocaleString()
                                            : '—'}
                                    </CardDescription>
                                </div>
                                <Badge variant="outline">
                                    {registration.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Name
                                </p>
                                <p className="mt-1 font-medium">
                                    {registration.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                    Email
                                </p>
                                <p className="mt-1 font-medium break-all">
                                    {registration.email}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Access decision</CardTitle>
                            <CardDescription>
                                Approval creates an active, verified account.
                                Rejection keeps the request for audit history.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-5">
                            {pending ? (
                                <>
                                    <Form
                                        action={`/access/users/registrations/${registration.id}/approve`}
                                        method="post"
                                        className="grid gap-4"
                                    >
                                        {({ processing, errors }) => (
                                            <>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="registration-role">
                                                        Role
                                                    </Label>
                                                    <select
                                                        id="registration-role"
                                                        name="role_id"
                                                        required
                                                        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                    >
                                                        <option value="">
                                                            Choose a role
                                                        </option>
                                                        {roles.map((role) => (
                                                            <option
                                                                key={role.id}
                                                                value={role.id}
                                                            >
                                                                {
                                                                    role.display_name
                                                                }
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <InputError
                                                        message={errors.role_id}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.registration
                                                        }
                                                    />
                                                </div>
                                                <Button disabled={processing}>
                                                    <Check />
                                                    Approve registration
                                                </Button>
                                            </>
                                        )}
                                    </Form>
                                    <Form
                                        action={`/access/users/registrations/${registration.id}/reject`}
                                        method="post"
                                        onSubmit={(event) => {
                                            if (
                                                !window.confirm(
                                                    `Reject ${registration.name}'s registration?`,
                                                )
                                            ) {
                                                event.preventDefault();
                                            }
                                        }}
                                    >
                                        <Button
                                            type="submit"
                                            variant="outline"
                                            className="w-full text-destructive hover:text-destructive"
                                        >
                                            <X />
                                            Reject registration
                                        </Button>
                                    </Form>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    This registration has already been reviewed
                                    and cannot be changed.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

RegistrationReviewPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
        { title: 'Review registration', href: '/access/users/registrations' },
    ],
};
