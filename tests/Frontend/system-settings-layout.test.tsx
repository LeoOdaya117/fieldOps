import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const usePageMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
    }: {
        href: string | { url: string };
        children?: ReactNode;
    }) => <a href={typeof href === 'string' ? href : href.url}>{children}</a>,
    usePage: usePageMock,
    router: { visit: vi.fn() },
}));

import SystemSettingsLayout from '@/layouts/settings/system-layout';

describe('system settings navigation', () => {
    beforeEach(() => {
        usePageMock.mockReturnValue({ url: '/settings/system' });
    });

    it('uses a separate admin settings navigation', () => {
        render(
            <SystemSettingsLayout>
                <div>System settings content</div>
            </SystemSettingsLayout>,
        );

        expect(
            screen.getByRole('heading', {
                name: 'System settings',
                level: 1,
            }),
        ).toBeInTheDocument();
        expect(screen.queryByText('My settings')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'General' })).toHaveAttribute(
            'href',
            '/settings/system',
        );
        expect(
            screen.getByRole('link', { name: 'Layout themes' }),
        ).toHaveAttribute('href', '/settings/system/layout');
        expect(screen.getByRole('link', { name: 'Address' })).toHaveAttribute('href', '/settings/system/address');
        expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute('href', '/settings/system/map');
        expect(screen.getByRole('link', { name: 'Platform images' })).toHaveAttribute('href', '/settings/system/platform-images');
    });
});
