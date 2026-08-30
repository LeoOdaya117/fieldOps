import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const usePageMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
        prefetch,
        ...props
    }: {
        href: string | { url: string };
        children?: ReactNode;
        prefetch?: boolean;
    }) => {
        void prefetch;

        return (
            <a href={typeof href === 'string' ? href : href.url} {...props}>
                {children}
            </a>
        );
    },
    usePage: usePageMock,
}));

vi.mock('@/components/app-logo', () => ({
    default: () => <span>FieldOps</span>,
}));

vi.mock('@/components/nav-footer', () => ({
    NavFooter: ({
        items,
    }: {
        items: { title: string; href: string | { url: string } }[];
    }) => (
        <nav data-testid="sidebar-footer-nav">
            {items.map((item) => (
                <a
                    key={item.title}
                    href={
                        typeof item.href === 'string'
                            ? item.href
                            : item.href.url
                    }
                >
                    {item.title}
                </a>
            ))}
        </nav>
    ),
}));

vi.mock('@/components/nav-user', () => ({
    NavUser: () => null,
}));

vi.mock('@/components/nav-main', () => ({
    NavMain: ({
        items,
    }: {
        items: { title: string; href: string | { url: string } }[];
    }) => (
        <nav>
            {items.map((item) => (
                <a
                    key={item.title}
                    href={
                        typeof item.href === 'string'
                            ? item.href
                            : item.href.url
                    }
                >
                    {item.title}
                </a>
            ))}
        </nav>
    ),
}));

vi.mock('@/components/ui/sidebar', () => {
    const Container = ({ children }: { children?: ReactNode }) => (
        <div>{children}</div>
    );

    return {
        Sidebar: Container,
        SidebarContent: Container,
        SidebarFooter: Container,
        SidebarHeader: Container,
        SidebarMenu: Container,
        SidebarMenuButton: Container,
        SidebarMenuItem: Container,
    };
});

import { AppSidebar } from '@/components/app-sidebar';

describe('app sidebar navigation', () => {
    beforeEach(() => {
        usePageMock.mockReset();
    });

    it('shows system settings to administrators', () => {
        usePageMock.mockReturnValue({
            url: '/access/users',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'Admin' },
                    authorization: {
                        permissions: ['settings.manage_system'],
                        isOwner: false,
                    },
                },
            },
        });

        render(<AppSidebar />);

        const footer = within(screen.getByTestId('sidebar-footer-nav'));

        expect(
            footer.getByRole('link', { name: 'System settings' }),
        ).toHaveAttribute('href', '/settings/system');
        expect(screen.queryByText('Repository')).not.toBeInTheDocument();
        expect(screen.queryByText('Documentation')).not.toBeInTheDocument();
    });

    it('hides system settings from users without permission', () => {
        usePageMock.mockReturnValue({
            url: '/settings/profile',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'User' },
                    authorization: {
                        permissions: [],
                        isOwner: false,
                    },
                },
            },
        });

        render(<AppSidebar />);

        expect(
            screen.queryByRole('link', { name: 'System settings' }),
        ).not.toBeInTheDocument();
    });

    it('shows security navigation to users with the matching permissions', () => {
        usePageMock.mockReturnValue({
            url: '/access/ip-blocks',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'Security admin' },
                    authorization: {
                        permissions: ['ip_blocks.view', 'visit_logs.view'],
                        isOwner: false,
                    },
                },
            },
        });

        render(<AppSidebar />);

        expect(
            screen.getByRole('link', { name: 'Blocked IPs' }),
        ).toHaveAttribute('href', '/access/ip-blocks');
        expect(
            screen.getByRole('link', { name: 'Visit logs' }),
        ).toHaveAttribute('href', '/access/visit-logs');
    });

    it('shows country and timezone navigation to users with catalog permissions', () => {
        usePageMock.mockReturnValue({
            url: '/system/countries',
            props: {
                name: 'FieldOps',
                auth: {
                    user: { name: 'Administrator' },
                    authorization: {
                        permissions: ['countries.view', 'timezones.view'],
                        isOwner: false,
                    },
                },
            },
        });

        render(<AppSidebar />);

        expect(screen.getByRole('link', { name: 'Countries' })).toHaveAttribute(
            'href',
            '/system/countries',
        );
        expect(screen.getByRole('link', { name: 'Timezones' })).toHaveAttribute(
            'href',
            '/system/timezones',
        );
    });
});
