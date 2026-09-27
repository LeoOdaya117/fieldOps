import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const usePageMock = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({ usePage: usePageMock }));
vi.mock('@/layouts/app/app-sidebar-layout', () => ({
    default: ({ children }: { children: ReactNode }) => (
        <div data-testid="canvas-pack">{children}</div>
    ),
}));
vi.mock('@/layouts/app/app-atlas-layout', () => ({
    default: ({ children }: { children: ReactNode }) => (
        <div data-testid="atlas-pack">{children}</div>
    ),
}));
vi.mock('@/layouts/app/app-rail-layout', () => ({
    default: ({ children }: { children: ReactNode }) => (
        <div data-testid="rail-pack">{children}</div>
    ),
}));
vi.mock('@/layouts/app/app-navigator-layout', () => ({
    default: ({ children }: { children: ReactNode }) => (
        <div data-testid="navigator-pack">{children}</div>
    ),
}));
vi.mock('@/layouts/app/app-header-layout', () => ({
    default: ({
        children,
        breadcrumbs,
    }: {
        children: ReactNode;
        breadcrumbs?: { title: string }[];
    }) => (
        <div data-testid="horizon-pack">
            <div data-testid="horizon-breadcrumbs">
                {breadcrumbs?.map((item) => item.title).join(' / ')}
            </div>
            {children}
        </div>
    ),
}));
vi.mock('@/components/flash-alert', () => ({ FlashAlert: () => null }));
vi.mock('@/features/notifications/notification-provider', () => ({
    NotificationProvider: ({ children }: { children: ReactNode }) => (
        <>{children}</>
    ),
}));
vi.mock('@/components/platform-runtime', () => ({
    PlatformRuntime: () => null,
}));

import AppLayout from '@/layouts/app-layout';

describe('platform theme registry', () => {
    it.each([
        ['canvas', 'canvas-pack'],
        ['atlas', 'atlas-pack'],
        ['rail', 'rail-pack'],
        ['navigator', 'navigator-pack'],
        ['horizon', 'horizon-pack'],
    ] as const)('renders the %s shell', (theme, testId) => {
        usePageMock.mockReturnValue({ props: { system: { theme } } });
        render(<AppLayout>Workspace</AppLayout>);
        expect(screen.getByTestId(testId)).toHaveTextContent('Workspace');
    });

    it('adds Dashboard before page breadcrumbs by default', () => {
        usePageMock.mockReturnValue({
            props: { system: { theme: 'horizon' } },
        });

        render(
            <AppLayout
                breadcrumbs={[
                    { title: 'Profile settings', href: '/settings/profile' },
                ]}
            >
                Workspace
            </AppLayout>,
        );

        expect(screen.getByTestId('horizon-breadcrumbs')).toHaveTextContent(
            'Dashboard / Profile settings',
        );
    });
});
