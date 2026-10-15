import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const usePageMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        ...props
    }: {
        href: string | { url: string };
        children?: ReactNode;
    }) => (
        <a href={typeof href === 'string' ? href : href.url} {...props}>
            {children}
        </a>
    ),
    usePage: usePageMock,
}));

import SettingsLayout from '@/layouts/settings/layout';

describe('settings navigation', () => {
    it('keeps system settings out of the personal settings navigation', () => {
        usePageMock.mockReturnValue({ url: '/settings/profile' });

        render(
            <SettingsLayout>
                <div>Settings content</div>
            </SettingsLayout>,
        );

        expect(screen.getByText('My settings')).toBeInTheDocument();
        expect(
            screen.queryByRole('link', { name: 'System settings' }),
        ).not.toBeInTheDocument();
    });
});
