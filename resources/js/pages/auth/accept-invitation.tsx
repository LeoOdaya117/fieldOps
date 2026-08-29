import { Form, Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AcceptInvitation({
    valid,
    email,
    role,
    token,
}: {
    valid: boolean;
    email?: string;
    role?: string;
    token: string;
}) {
    return (
        <>
            <Head title="Accept invitation" />
            {valid ? (
                <Form
                    action={`/invitations/${token}`}
                    method="post"
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <h1 className="text-2xl font-semibold">
                                    Join FieldOps
                                </h1>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    You were invited as {role}. Create your
                                    account for {email}.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    autoComplete="name"
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">
                                        {errors.name}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    autoComplete="new-password"
                                />
                                {errors.password && (
                                    <p className="text-sm text-destructive">
                                        {errors.password}
                                    </p>
                                )}
                            </div>
                            <Button disabled={processing} className="w-full">
                                Create account
                            </Button>
                        </>
                    )}
                </Form>
            ) : (
                <div className="space-y-3">
                    <h1 className="text-2xl font-semibold">
                        Invitation unavailable
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        This invitation has expired, been revoked, or was
                        already used. Ask an administrator for a new invitation.
                    </p>
                </div>
            )}
        </>
    );
}
