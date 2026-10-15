import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        href,
        children,
    }: {
        href: string | { url: string };
        children?: ReactNode;
    }) => <a href={typeof href === 'string' ? href : href.url}>{children}</a>,
}));

vi.mock('@/components/ui/sidebar', () => {
    const Container = ({ children }: { children?: ReactNode }) => (
        <div>{children}</div>
    );

    return {
        SidebarGroup: Container,
        SidebarGroupContent: Container,
        SidebarMenu: Container,
        SidebarMenuButton: Container,
        SidebarMenuItem: Container,
    };
});

import { NavFooter } from '@/components/nav-footer';

describe('sidebar footer navigation', () => {
    it('keeps internal navigation in the current tab', () => {
        render(
            <NavFooter
                items={[{ title: 'System settings', href: '/settings/system' }]}
            />,
        );

        expect(
            screen.getByRole('link', { name: 'System settings' }),
        ).not.toHaveAttribute('target');
    });
});
