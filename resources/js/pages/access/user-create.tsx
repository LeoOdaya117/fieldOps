import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, Send } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

type RoleOption = {
    id: number;
    name: string;
    display_name: string;
    is_system: boolean;
};

export default function UserCreatePage({ roles }: { roles: RoleOption[] }) {
    return (
        <>
            <Head title="Invite user" />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink href="/access/users" variant="ghost" size="sm">
                    <ArrowLeft />
                    Back to users
                </ActionLink>
                <Heading
                    title="Invite a user"
                    description="Send a secure invitation and assign the account's initial role."
                />
                <Card className="max-w-3xl">
                    <CardHeader>
                        <CardTitle>Invitation details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form
                            action="/access/users/invitations"
                            method="post"
                            className="grid gap-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-email">
                                            Email address
                                        </Label>
                                        <Input
                                            id="invite-email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            placeholder="name@company.com"
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="invite-role">
                                            Initial role
                                        </Label>
                                        <select
                                            id="invite-role"
                                            name="role_id"
                                            required
                                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
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
                                        <InputError message={errors.role_id} />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button disabled={processing}>
                                            <Send />
                                            Send invitation
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

UserCreatePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
        { title: 'Invite user', href: '/access/users/create' },
    ],
};
