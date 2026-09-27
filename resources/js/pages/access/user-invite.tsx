import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, Send } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSelect } from '@/components/ui/form-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserRoleOption } from '@/features/access/components/user-form';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

export default function UserInvitePage({ roles }: { roles: UserRoleOption[] }) {
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
                    description="Send a secure invitation for the recipient to finish setting up their account."
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
                                        <FormSelect
                                            id="invite-role"
                                            name="role_id"
                                            required
                                            options={[
                                                {
                                                    value: '',
                                                    label: 'Choose a role',
                                                },
                                                ...roles.map((role) => ({
                                                    value: String(role.id),
                                                    label: role.display_name,
                                                })),
                                            ]}
                                        />
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

UserInvitePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
        { title: 'Invite user', href: '/access/users/invite' },
    ],
};
