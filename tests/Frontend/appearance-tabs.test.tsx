import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AppearanceToggleTab from '@/components/appearance-tabs';

describe('AppearanceToggleTab', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
    });

    afterEach(() => {
        document.documentElement.classList.remove('dark');
    });

    it('switches the application to dark mode', async () => {
        const user = userEvent.setup();

        render(<AppearanceToggleTab />);

        await user.click(screen.getByRole('button', { name: 'Dark' }));

        expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(document.documentElement).toHaveClass('dark');
        expect(localStorage.getItem('appearance')).toBe('dark');
    });

    it('shows the system preference option as selectable', async () => {
        const user = userEvent.setup();

        render(<AppearanceToggleTab />);

        await user.click(screen.getByRole('button', { name: 'System' }));

        expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(localStorage.getItem('appearance')).toBe('system');
    });
});
