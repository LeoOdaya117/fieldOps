import type { FormHTMLAttributes, ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

type FormProps = FormHTMLAttributes<HTMLFormElement> & {
    children?: ReactNode | ((state: { processing: boolean; errors: Record<string, string> }) => ReactNode);
};

vi.mock('@inertiajs/react', () => ({
    Form: ({ children, ...props }: FormProps) => <form {...props}>{typeof children === 'function' ? children({ processing: false, errors: {} }) : children}</form>,
    Head: () => null,
}));

import SystemSettings from '@/pages/settings/system';

describe('system settings page', () => {
    it('keeps General focused and submits shadcn select values', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <SystemSettings
                settings={{ name: 'FieldOps', timezone: 'UTC', pagination_size: '50', idle_timeout_seconds: '900', login_max_attempts: '5', login_decay_minutes: '30' }}
                timezones={['UTC', 'Asia/Manila']}
                paginationOptions={[25, 50, 75, 100]}
                maximumIdleTimeoutSeconds={7200}
            />,
        );

        expect(screen.getByRole('heading', { name: 'Organization' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Defaults' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Sign-in protection' })).toBeInTheDocument();
        expect(screen.queryByText('Interface theme')).not.toBeInTheDocument();
        expect(screen.getByLabelText('System name')).toHaveValue('FieldOps');

        await user.click(screen.getByRole('combobox', { name: 'Time zone' }));
        await user.click(screen.getByRole('option', { name: 'Asia/Manila' }));
        expect(container.querySelector('input[name="timezone"]')).toHaveValue('Asia/Manila');

        await user.click(screen.getByRole('combobox', { name: 'Rows per page' }));
        await user.click(screen.getByRole('option', { name: '75 rows' }));
        expect(container.querySelector('input[name="pagination_size"]')).toHaveValue('75');
        expect(screen.getByLabelText('Log out after inactivity')).toHaveValue(900);
        expect(screen.getByLabelText('Failed attempts allowed')).toHaveValue(5);
        expect(screen.getByLabelText('Reset attempts after')).toHaveValue(30);
        expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });
});
