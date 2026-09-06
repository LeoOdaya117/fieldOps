import type { FormHTMLAttributes, ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlatformLayoutSettings from '@/pages/settings/system/layout';
import type { PlatformThemeOption } from '@/types';

type FormProps = FormHTMLAttributes<HTMLFormElement> & { children?: ReactNode | ((state: { processing: boolean; errors: Record<string, string> }) => ReactNode) };
vi.mock('@inertiajs/react', () => ({
    Form: ({ children, ...props }: FormProps) => <form {...props}>{typeof children === 'function' ? children({ processing: false, errors: {} }) : children}</form>,
    Head: () => null,
}));

const themes: PlatformThemeOption[] = ['canvas', 'atlas', 'rail', 'navigator', 'horizon'].map((value) => ({ value: value as PlatformThemeOption['value'], label: value[0].toUpperCase() + value.slice(1), description: `${value} layout`, traits: ['Trait one', 'Trait two'] }));

describe('layout theme settings', () => {
    it('shows five visual choices and enables apply only for a new selection', async () => {
        const user = userEvent.setup();
        const { container } = render(<PlatformLayoutSettings currentTheme="canvas" themes={themes} />);
        expect(screen.getAllByRole('radio')).toHaveLength(5);
        expect(screen.getByRole('radio', { name: /canvas/i })).toBeChecked();
        expect(screen.getByRole('button', { name: 'Apply layout' })).toBeDisabled();
        screen.getByRole('radio', { name: /navigator/i }).focus();
        await user.keyboard('[Space]');
        expect(screen.getByRole('radio', { name: /navigator/i })).toBeChecked();
        expect(screen.getByRole('button', { name: 'Apply layout' })).toBeEnabled();
        expect(container.querySelector('input[name="theme"]')).toHaveValue('navigator');
    });
});
