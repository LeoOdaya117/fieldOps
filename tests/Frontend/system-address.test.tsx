import type { FormHTMLAttributes, ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

type FormProps = FormHTMLAttributes<HTMLFormElement> & {
    children?: ReactNode | ((state: { processing: boolean; errors: Record<string, string> }) => ReactNode);
};

vi.mock('@inertiajs/react', () => ({
    Form: ({ children, ...props }: FormProps) => (
        <form {...props}>{typeof children === 'function' ? children({ processing: false, errors: {} }) : children}</form>
    ),
    Head: () => null,
}));

import OrganizationAddress from '@/pages/settings/system/address';

const regions = [
    { code: '01', name: 'Ilocos Region' },
    { code: '13', name: 'National Capital Region' },
];
const provinces = [{ code: '0128', region_code: '01', name: 'Ilocos Norte' }];
const localities = [
    { code: '012801', region_code: '01', province_code: '0128', name: 'Adams', type: 'municipality' as const, is_independent: false },
    { code: '1339', region_code: '13', province_code: null, name: 'City of Manila', type: 'city' as const, is_independent: true },
];

describe('organization address', () => {
    it('clears descendants when an ancestor changes and supports independent cities', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <OrganizationAddress
                location={{ region_code: '01', province_code: '0128', locality_code: '012801' }}
                regions={regions}
                provinces={provinces}
                localities={localities}
            />,
        );

        expect(screen.getByRole('combobox', { name: 'Municipality or city' })).toHaveTextContent('Adams');
        await user.click(screen.getByRole('combobox', { name: 'Region' }));
        await user.click(screen.getByRole('option', { name: 'National Capital Region' }));
        expect(container.querySelector('input[name="region_code"]')).toHaveValue('13');
        expect(container.querySelector('input[name="locality_code"]')).toHaveValue('');

        await user.click(screen.getByRole('combobox', { name: 'Province or region-level locality' }));
        await user.click(screen.getByRole('option', { name: 'City of Manila' }));
        expect(screen.getByRole('combobox', { name: 'Municipality or city' })).toBeDisabled();
        expect(container.querySelector('input[name="province_code"]')).toHaveValue('');
        expect(container.querySelector('input[name="locality_code"]')).toHaveValue('1339');
    });
});
