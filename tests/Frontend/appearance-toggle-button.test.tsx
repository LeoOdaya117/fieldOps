import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppearanceToggleButton } from '@/components/appearance-toggle-button';
import { initializeTheme } from '@/hooks/use-appearance';

function setMediaPreferences({
    prefersDark,
    prefersReducedMotion,
}: {
    prefersDark: boolean;
    prefersReducedMotion: boolean;
}): void {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn((query: string): MediaQueryList => ({
            matches: query.includes('prefers-reduced-motion')
                ? prefersReducedMotion
                : prefersDark,
            media: query,
            onchange: null,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            addListener: () => undefined,
            removeListener: () => undefined,
            dispatchEvent: () => false,
        })),
    });
}

function initializeAppearance({
    appearance = 'system',
    prefersDark = false,
    prefersReducedMotion = false,
}: {
    appearance?: 'light' | 'dark' | 'system';
    prefersDark?: boolean;
    prefersReducedMotion?: boolean;
} = {}): void {
    localStorage.setItem('appearance', appearance);
    setMediaPreferences({ prefersDark, prefersReducedMotion });
    initializeTheme();
}

describe('AppearanceToggleButton', () => {
    beforeEach(() => {
        localStorage.clear();
        document.cookie = 'appearance=; path=/; max-age=0';
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.remove(
            'theme-transitioning',
            'theme-ripple',
        );
        document.documentElement.style.removeProperty('--theme-ripple-x');
        document.documentElement.style.removeProperty('--theme-ripple-y');
        document.documentElement.style.colorScheme = '';
        Reflect.deleteProperty(document, 'startViewTransition');
        initializeAppearance();
    });

    it('switches from light to dark and persists the explicit preference', async () => {
        const user = userEvent.setup();

        render(<AppearanceToggleButton />);
        const toggle = screen.getByRole('button', { name: 'Dark mode' });

        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        expect(toggle).toHaveAttribute('title', 'Switch to dark mode');
        await user.click(toggle);

        expect(toggle).toHaveAttribute('aria-pressed', 'true');
        expect(toggle).toHaveAttribute('title', 'Switch to light mode');
        expect(document.documentElement).toHaveClass('dark');
        expect(document.documentElement).toHaveClass('theme-transitioning');
        expect(localStorage.getItem('appearance')).toBe('dark');
        expect(document.cookie).toContain('appearance=dark');
        await waitFor(() =>
            expect(document.documentElement).not.toHaveClass(
                'theme-transitioning',
            ),
        );
    });

    it('switches from dark back to light', async () => {
        initializeAppearance({ appearance: 'dark' });
        const user = userEvent.setup();

        render(<AppearanceToggleButton />);
        const toggle = screen.getByRole('button', { name: 'Dark mode' });

        expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await user.click(toggle);

        expect(toggle).toHaveAttribute('aria-pressed', 'false');
        expect(document.documentElement).not.toHaveClass('dark');
        expect(localStorage.getItem('appearance')).toBe('light');
        expect(document.cookie).toContain('appearance=light');
    });

    it.each([
        { prefersDark: false, expectedAppearance: 'dark' },
        { prefersDark: true, expectedAppearance: 'light' },
    ])(
        'switches from the system theme to explicit $expectedAppearance mode',
        async ({ prefersDark, expectedAppearance }) => {
            initializeAppearance({ prefersDark });
            const user = userEvent.setup();

            render(<AppearanceToggleButton />);
            await user.click(screen.getByRole('button', { name: 'Dark mode' }));

            expect(localStorage.getItem('appearance')).toBe(expectedAppearance);
            expect(document.cookie).toContain(
                `appearance=${expectedAppearance}`,
            );
            expect(document.documentElement.classList.contains('dark')).toBe(
                expectedAppearance === 'dark',
            );
        },
    );

    it('supports keyboard activation and reports the toggle state', async () => {
        const user = userEvent.setup();

        render(<AppearanceToggleButton />);
        await user.tab();

        const toggle = screen.getByRole('button', { name: 'Dark mode' });
        expect(toggle).toHaveFocus();

        await user.keyboard('{Enter}');

        expect(toggle).toHaveAttribute('aria-pressed', 'true');
        expect(document.documentElement).toHaveClass('dark');
    });

    it('changes theme without animation when reduced motion is requested', async () => {
        initializeAppearance({ prefersReducedMotion: true });
        const startViewTransition = vi.fn();
        Object.defineProperty(document, 'startViewTransition', {
            configurable: true,
            value: startViewTransition,
        });
        const user = userEvent.setup();

        render(<AppearanceToggleButton />);
        await user.click(screen.getByRole('button', { name: 'Dark mode' }));

        expect(document.documentElement).toHaveClass('dark');
        expect(document.documentElement).not.toHaveClass('theme-transitioning');
        expect(document.documentElement).not.toHaveClass('theme-ripple');
        expect(startViewTransition).not.toHaveBeenCalled();
    });

    it('ripples from the toggle and clears after the view transition', async () => {
        let finishTransition: (() => void) | undefined;
        const startViewTransition = vi.fn((update: () => void) => {
            update();

            return {
                finished: new Promise<void>((resolve) => {
                    finishTransition = resolve;
                }),
            };
        });
        Object.defineProperty(document, 'startViewTransition', {
            configurable: true,
            value: startViewTransition,
        });
        const user = userEvent.setup();

        render(<AppearanceToggleButton />);
        const toggle = screen.getByRole('button', { name: 'Dark mode' });
        vi.spyOn(toggle, 'getBoundingClientRect').mockReturnValue({
            left: 20,
            top: 30,
            width: 40,
            height: 40,
        } as DOMRect);
        await user.click(toggle);

        expect(startViewTransition).toHaveBeenCalledOnce();
        expect(document.documentElement).toHaveClass('dark', 'theme-ripple');
        expect(document.documentElement).not.toHaveClass('theme-transitioning');
        expect(
            document.documentElement.style.getPropertyValue('--theme-ripple-x'),
        ).toBe('40px');
        expect(
            document.documentElement.style.getPropertyValue('--theme-ripple-y'),
        ).toBe('50px');

        finishTransition?.();
        await waitFor(() =>
            expect(document.documentElement).not.toHaveClass('theme-ripple'),
        );
        expect(
            document.documentElement.style.getPropertyValue('--theme-ripple-x'),
        ).toBe('');
    });
});
