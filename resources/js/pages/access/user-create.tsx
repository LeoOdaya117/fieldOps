import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import UserForm from '@/features/access/components/user-form';
import type { UserRoleOption } from '@/features/access/components/user-form';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

export default function UserCreatePage({ roles }: { roles: UserRoleOption[] }) {
    return (
        <>
            <Head title="Add user" />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink href="/access/users" variant="ghost" size="sm">
                    <ArrowLeft />
                    Back to users
                </ActionLink>
                <Heading
                    title="Add a user"
                    description="Create an account directly and choose its initial access profile."
                />
                <UserForm
                    action="/access/users"
                    method="post"
                    roles={roles}
                    submitLabel="Create user"
                />
            </div>
        </>
    );
}

UserCreatePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
        { title: 'Add user', href: '/access/users/create' },
    ],
};
