import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import UserForm from '@/features/access/components/user-form';
import type {
    EditableUser,
    UserRoleOption,
} from '@/features/access/components/user-form';
import { dashboard } from '@/routes';
import { index as usersIndex } from '@/routes/access/users';

export default function UserEditPage({
    user,
    roles,
}: {
    user: EditableUser;
    roles: UserRoleOption[];
}) {
    return (
        <>
            <Head title={`Edit ${user.name}`} />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <Heading
                    title={`Edit ${user.name}`}
                    description="Keep identity, role, profile, and access settings up to date."
                />
                <UserForm
                    action={`/access/users/${user.id}`}
                    method="patch"
                    roles={roles}
                    user={user}
                    submitLabel="Save changes"
                />
            </div>
        </>
    );
}

UserEditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Users', href: usersIndex() },
        { title: 'Edit user', href: '/access/users' },
    ],
};
