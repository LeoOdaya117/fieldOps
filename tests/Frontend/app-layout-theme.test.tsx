import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const usePageMock = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({ usePage: usePageMock }));
vi.mock('@/layouts/app/app-sidebar-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="canvas-pack">{children}</div> }));
vi.mock('@/layouts/app/app-atlas-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="atlas-pack">{children}</div> }));
vi.mock('@/layouts/app/app-rail-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="rail-pack">{children}</div> }));
vi.mock('@/layouts/app/app-navigator-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="navigator-pack">{children}</div> }));
vi.mock('@/layouts/app/app-header-layout', () => ({ default: ({ children }: { children: ReactNode }) => <div data-testid="horizon-pack">{children}</div> }));
vi.mock('@/components/flash-alert', () => ({ FlashAlert: () => null }));
vi.mock('@/components/platform-runtime', () => ({ PlatformRuntime: () => null }));

import AppLayout from '@/layouts/app-layout';

describe('platform theme registry', () => {
    it.each([
        ['canvas', 'canvas-pack'], ['atlas', 'atlas-pack'], ['rail', 'rail-pack'], ['navigator', 'navigator-pack'], ['horizon', 'horizon-pack'],
    ] as const)('renders the %s shell', (theme, testId) => {
        usePageMock.mockReturnValue({ props: { system: { theme } } });
        render(<AppLayout>Workspace</AppLayout>);
        expect(screen.getByTestId(testId)).toHaveTextContent('Workspace');
    });
});
