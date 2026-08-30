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
}));

import SystemSettings from '@/pages/settings/system';

describe('system settings page', () => {
    it('renders organization and list default settings', () => {
        render(
            <SystemSettings
                settings={{
                    name: 'FieldOps',
                    timezone: 'UTC',
                    pagination_size: '50',
                }}
                timezones={['UTC', 'Asia/Manila']}
                paginationOptions={[25, 50, 75, 100]}
            />,
        );

        expect(
            screen.getByRole('heading', {
                name: 'System settings',
                level: 1,
            }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText('System name')).toHaveValue('FieldOps');
        expect(screen.getByLabelText('Time zone')).toHaveValue('UTC');
        expect(
            screen.getByRole('option', { name: 'Asia/Manila' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'UTC' })).toBeInTheDocument();
        expect(screen.getByLabelText('Default rows per page')).toHaveValue(
            '50',
        );
        expect(
            screen.getByRole('button', { name: 'Save system settings' }),
        ).toBeInTheDocument();
    });
});
