import type { FormHTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

type FormProps = FormHTMLAttributes<HTMLFormElement> & {
    children?:
        | ReactNode
        | ((state: {
              processing: boolean;
              errors: Record<string, string>;
          }) => ReactNode);
};

vi.mock('@inertiajs/react', () => ({
    Form: ({ children, ...props }: FormProps) => (
        <form {...props}>
            {typeof children === 'function'
                ? children({ processing: false, errors: {} })
                : children}
        </form>
    ),
    Head: () => null,
    Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
    usePage: () => ({
        props: {
            auth: {
                user: {
                    id: 8,
                    name: 'Alex Morgan',
                    email: 'alex@example.com',
                    position: 'Supervisor',
                    department: 'Operations',
                    avatar: '/storage/users/8/avatar.jpg',
                    email_verified_at: '2030-01-01T00:00:00Z',
                    created_at: '2030-01-01T00:00:00Z',
                    updated_at: '2030-01-01T00:00:00Z',
                    status: 'active',
                },
                authorization: {
                    role: null,
                    permissions: [],
                    isOwner: false,
                },
            },
        },
    }),
}));

import Profile from '@/pages/settings/profile';

describe('profile settings page', () => {
    it('renders the editable profile fields and photo controls', () => {
        render(<Profile mustVerifyEmail={false} />);

        expect(
            screen.getByRole('heading', { name: 'Personal information' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Name')).toHaveValue('Alex Morgan');
        expect(screen.getByLabelText('Email address')).toHaveValue(
            'alex@example.com',
        );
        expect(screen.getByLabelText('Position')).toHaveValue('Supervisor');
        expect(screen.getByLabelText('Department')).toHaveValue('Operations');
        expect(
            screen.getByRole('heading', { name: 'Profile photo' }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('Upload photo')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Remove current photo' }),
        ).toBeInTheDocument();
    });
});
