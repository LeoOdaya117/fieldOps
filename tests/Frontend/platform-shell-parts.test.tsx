import type { AnchorHTMLAttributes, ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        onClick,
        ...props
    }: {
        href: string;
        children?: ReactNode;
        onClick?: AnchorHTMLAttributes<HTMLAnchorElement>['onClick'];
    }) => (
        <a
            href={href}
            {...props}
            onClick={(event) => {
                event.preventDefault();
                onClick?.(event);
            }}
        >
            {children}
        </a>
    ),
    usePage: () => ({
        url: '/settings/system/backups',
        props: {
            system: {
                name: 'FieldOps',
            },
        },
    }),
}));

import { MobilePlatformNavigation } from '@/components/platform-shell-parts';

describe('MobilePlatformNavigation', () => {
    it('marks the specific destination active without activating its parent', async () => {
        const user = userEvent.setup();

        render(
            <MobilePlatformNavigation
                groups={[
                    {
                        label: 'System',
                        items: [
                            {
                                title: 'System settings',
                                href: '/settings/system',
                            },
                            {
                                title: 'Backup & Restore',
                                href: '/settings/system/backups',
                            },
                        ],
                    },
                ]}
            />,
        );

        await user.click(
            screen.getByRole('button', { name: 'Open navigation' }),
        );

        expect(
            screen.getByRole('link', { name: 'System settings' }),
        ).not.toHaveAttribute('aria-current');
        expect(
            screen.getByRole('link', { name: 'Backup & Restore' }),
        ).toHaveAttribute('aria-current', 'page');
    });

    it('closes after selecting a navigation link', async () => {
        const user = userEvent.setup();

        render(
            <MobilePlatformNavigation
                groups={[
                    {
                        label: 'Platform',
                        items: [
                            {
                                title: 'Dashboard',
                                href: '/dashboard',
                            },
                        ],
                    },
                ]}
            />,
        );

        const trigger = screen.getByRole('button', {
            name: 'Open navigation',
        });

        await user.click(trigger);
        await user.click(screen.getByRole('link', { name: 'Dashboard' }));

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
});
