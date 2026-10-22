import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        prefetch,
        ...props
    }: {
        children?: ReactNode;
        href: string;
        prefetch?: boolean;
    }) => {
        void prefetch;

        return (
            <a data-inertia-link="true" href={href} {...props}>
                {children}
            </a>
        );
    },
}));

vi.mock('@/components/ui/sidebar', () => ({
    SidebarGroup: ({ children }: { children?: ReactNode }) => (
        <section>{children}</section>
    ),
    SidebarGroupLabel: ({ children }: { children?: ReactNode }) => (
        <h2>{children}</h2>
    ),
    SidebarMenu: ({ children }: { children?: ReactNode }) => (
        <ul>{children}</ul>
    ),
    SidebarMenuButton: ({ children }: { children?: ReactNode }) => (
        <div>{children}</div>
    ),
    SidebarMenuItem: ({ children }: { children?: ReactNode }) => (
        <li>{children}</li>
    ),
}));

vi.mock('@/hooks/use-current-url', () => ({
    useCurrentUrl: () => ({
        isCurrentUrl: () => false,
    }),
}));

import { NavMain } from '@/components/nav-main';

describe('NavMain destination rendering', () => {
    it('uses Inertia for app paths and a same-tab anchor for HTTPS destinations', () => {
        render(
            <NavMain
                items={[
                    { key: 'internal', title: 'Internal', href: '/reports' },
                    {
                        key: 'external',
                        title: 'External',
                        href: 'https://reports.example.test',
                        external: true,
                    },
                ]}
            />,
        );

        const internalLink = screen.getByRole('link', { name: 'Internal' });
        const externalLink = screen.getByRole('link', { name: 'External' });

        expect(internalLink).toHaveAttribute('href', '/reports');
        expect(internalLink).toHaveAttribute('data-inertia-link', 'true');
        expect(externalLink).toHaveAttribute(
            'href',
            'https://reports.example.test',
        );
        expect(externalLink).not.toHaveAttribute('data-inertia-link');
        expect(externalLink).not.toHaveAttribute('target');
    });
});
