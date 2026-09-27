import { act, cleanup, render, screen } from '@testing-library/react';
import { router } from '@inertiajs/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    pageFamilies,
    resolvePageFamily,
} from '@/features/page-loading/page-families';
import {
    PageLoadingBoundary,
    PageLoadingProvider,
} from '@/features/page-loading/page-loading-provider';
import { PageLoadingSkeleton } from '@/features/page-loading/page-loading-skeleton';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.getElementById('page-loading-fallback')?.remove();
});

describe('resolvePageFamily', () => {
    it.each([
        ['/', 'landing'],
        ['https://fieldops.test/dashboard?from=menu', 'dashboard'],
        ['/access/users', 'list'],
        ['/access/users?page=2', 'list'],
        ['/access/users/abc-123', 'detail'],
        ['/access/users/abc-123/edit', 'form'],
        ['/system/countries/create', 'form'],
        ['/access/users/registrations/42', 'detail'],
        ['/settings/system/layout', 'settings'],
        ['/login', 'auth'],
        ['/invitations/opaque-token', 'auth'],
        ['/something/new', 'generic'],
    ] as const)('resolves %s as %s', (url, family) => {
        expect(resolvePageFamily(url)).toBe(family);
    });

    it.each([
        ['/system/timezones', 'list'],
        ['/system/timezones/utc', 'detail'],
        ['/system/timezones/create', 'form'],
        ['/system/timezones/utc/edit', 'form'],
        ['/system/countries', 'list'],
        ['/system/countries/42', 'detail'],
        ['/system/countries/create', 'form'],
        ['/system/countries/42/edit', 'form'],
        ['/settings/system', 'settings'],
        ['/settings/system/platform-images', 'settings'],
        ['/settings/system/map', 'settings'],
        ['/settings/system/layout', 'settings'],
        ['/settings/system/address', 'settings'],
        ['/settings/security', 'settings'],
        ['/settings/profile', 'settings'],
        ['/settings/appearance', 'settings'],
        ['/notifications', 'list'],
        ['/email/verify', 'auth'],
        ['/two-factor-challenge', 'auth'],
        ['/reset-password/random-token', 'auth'],
        ['/register', 'auth'],
        ['/forgot-password', 'auth'],
        ['/user/confirm-password', 'auth'],
        ['/access/visit-logs', 'list'],
        ['/access/visit-logs/42', 'detail'],
        ['/access/users', 'list'],
        ['/access/users/42', 'detail'],
        ['/access/users/invite', 'form'],
        ['/access/users/42/edit', 'form'],
        ['/access/users/create', 'form'],
        ['/access/roles', 'list'],
        ['/access/roles/42', 'detail'],
        ['/access/roles/42/edit', 'form'],
        ['/access/roles/create', 'form'],
        ['/access/users/registrations', 'list'],
        ['/access/users/registrations/42', 'detail'],
        ['/access/ip-blocks', 'list'],
        ['/access/ip-blocks/42', 'detail'],
        ['/access/ip-blocks/42/edit', 'form'],
        ['/access/ip-blocks/create', 'form'],
        ['/access/audit', 'list'],
        ['/access/audit/42', 'detail'],
    ] as const)(
        'assigns the current page route %s to the %s family',
        (url, family) => {
            expect(resolvePageFamily(url)).toBe(family);
        },
    );
});

describe('PageLoadingSkeleton', () => {
    it.each(pageFamilies)('renders an accessible %s skeleton', (family) => {
        render(<PageLoadingSkeleton family={family} />);

        const status = screen.getByRole('status', { name: 'Loading page' });
        expect(status).toHaveAttribute('aria-busy', 'true');
        expect(status).toHaveAttribute('data-page-loading-family', family);
        expect(status).toHaveClass(
            'p-4',
            'sm:p-6',
            'lg:p-8',
            'motion-reduce:animate-none',
            'motion-reduce:duration-0',
        );
        expect(status.querySelector('[data-slot="skeleton"]')).toHaveClass(
            'bg-muted',
            'motion-reduce:animate-none',
        );
    });

    it('uses responsive layouts and semantic surfaces for content skeletons', () => {
        const { rerender } = render(<PageLoadingSkeleton family="dashboard" />);
        expect(screen.getByRole('status')).toHaveClass('min-w-0');
        expect(
            screen.getByRole('status').querySelector('.xl\\:grid-cols-4'),
        ).not.toBeNull();
        expect(
            screen.getByRole('status').querySelector('.bg-card.border-border'),
        ).not.toBeNull();

        rerender(<PageLoadingSkeleton family="landing" />);
        const landingContent = screen
            .getByRole('status')
            .querySelector('.mx-auto.grid');
        expect(landingContent).not.toHaveClass('px-5');
        expect(landingContent).not.toHaveClass('py-12');
        expect(landingContent).not.toHaveClass('md:px-8');
        expect(
            screen.getByRole('status').querySelector('.md\\:grid-cols-2'),
        ).not.toBeNull();
    });
});

function visit(id: string, url: string, method = 'get', prefetch = false) {
    return {
        id,
        url: new URL(url, window.location.origin),
        method,
        prefetch,
    };
}

function startVisit(id: string, url: string, method = 'get', prefetch = false) {
    document.dispatchEvent(
        new CustomEvent('inertia:start', {
            detail: { visit: visit(id, url, method, prefetch) },
        }),
    );
}

function beforeVisit(
    id: string,
    url: string,
    method = 'get',
    prefetch = false,
) {
    document.dispatchEvent(
        new CustomEvent('inertia:before', {
            cancelable: true,
            detail: { visit: visit(id, url, method, prefetch) },
        }),
    );
}

function finishVisit(id: string, state: Record<string, boolean> = {}) {
    document.dispatchEvent(
        new CustomEvent('inertia:finish', {
            detail: { visit: { id, ...state } },
        }),
    );
}

function renderBoundary(delay = 200) {
    return render(
        <PageLoadingProvider delay={delay}>
            <PageLoadingBoundary>
                <div data-testid="page-content">Current page</div>
            </PageLoadingBoundary>
        </PageLoadingProvider>,
    );
}

describe('PageLoadingProvider', () => {
    it('shows the destination family only after the delay and clears on finish', () => {
        vi.useFakeTimers();
        renderBoundary();

        startVisit('visit-1', '/access/users');
        act(() => vi.advanceTimersByTime(199));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByTestId('page-content')).toBeInTheDocument();

        act(() => vi.advanceTimersByTime(1));
        expect(screen.getByRole('status')).toHaveAttribute(
            'data-page-loading-family',
            'list',
        );
        expect(screen.queryByTestId('page-content')).not.toBeInTheDocument();

        act(() => finishVisit('visit-1'));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });

    it('does not flash for fast visits or show for action and prefetch requests', () => {
        vi.useFakeTimers();
        renderBoundary();

        startVisit('fast', '/access/users');
        act(() => {
            vi.advanceTimersByTime(100);
            finishVisit('fast');
            vi.advanceTimersByTime(300);
        });
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        startVisit('post', '/access/users', 'post');
        startVisit('prefetch', '/settings/profile', 'get', true);
        act(() => vi.advanceTimersByTime(300));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('keeps an active page skeleton through prefetch and clears it for a mutation visit', () => {
        vi.useFakeTimers();
        renderBoundary();

        startVisit('page', '/access/users');
        act(() => vi.advanceTimersByTime(200));
        expect(screen.getByRole('status')).toHaveAttribute(
            'data-page-loading-family',
            'list',
        );

        startVisit('prefetch', '/settings/profile', 'get', true);
        expect(screen.getByRole('status')).toBeInTheDocument();

        act(() => startVisit('mutation', '/access/users', 'post'));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });

    it('ignores a stale finish when a newer page visit is active', () => {
        vi.useFakeTimers();
        renderBoundary();

        startVisit('older', '/access/users');
        act(() => vi.advanceTimersByTime(100));
        startVisit('newer', '/system/countries/42');
        act(() => vi.advanceTimersByTime(200));

        expect(screen.getByRole('status')).toHaveAttribute(
            'data-page-loading-family',
            'detail',
        );
        act(() => finishVisit('older', { interrupted: true }));
        expect(screen.getByRole('status')).toBeInTheDocument();

        act(() => finishVisit('newer'));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it.each([
        ['cancellation', { cancelled: true }],
        ['interruption', { interrupted: true }],
        ['failed request', { completed: false }],
    ])('clears visible skeleton after %s', (_label, state) => {
        vi.useFakeTimers();
        renderBoundary();

        startVisit('terminal', '/settings/profile');
        act(() => vi.advanceTimersByTime(200));
        expect(screen.getByRole('status')).toBeInTheDocument();

        act(() => finishVisit('terminal', state));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('clears a failed network visit when its finish event arrives', () => {
        vi.useFakeTimers();
        renderBoundary();

        startVisit('network-failure', '/settings/profile');
        act(() => vi.advanceTimersByTime(200));
        expect(screen.getByRole('status')).toBeInTheDocument();

        act(() => {
            document.dispatchEvent(
                new CustomEvent('inertia:networkError', {
                    detail: { error: new Error('offline') },
                }),
            );
            finishVisit('network-failure', { completed: false });
        });

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows the target skeleton for a click that consumes an in-flight prefetch', () => {
        vi.useFakeTimers();
        vi.spyOn(router, 'getCached').mockReturnValue({
            params: { id: 'prefetch-source' },
        } as never);
        renderBoundary();

        beforeVisit('actual-navigation', '/access/users');
        act(() => vi.advanceTimersByTime(199));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        act(() => vi.advanceTimersByTime(1));
        expect(screen.getByRole('status')).toHaveAttribute(
            'data-page-loading-family',
            'list',
        );

        act(() => finishVisit('prefetch-source'));
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it.each(['success', 'error'] as const)(
        'clears a cached navigation on its actual visit %s event',
        (eventName) => {
            vi.useFakeTimers();
            vi.spyOn(router, 'getCached').mockReturnValue({
                params: { id: 'prefetch-source' },
            } as never);
            renderBoundary();

            beforeVisit('actual-navigation', '/settings/profile');
            act(() => vi.advanceTimersByTime(200));
            expect(screen.getByRole('status')).toBeInTheDocument();

            act(() => {
                document.dispatchEvent(
                    new CustomEvent(`inertia:${eventName}`, {
                        detail:
                            eventName === 'success'
                                ? {
                                      page: {},
                                      visitId: 'actual-navigation',
                                  }
                                : {
                                      errors: {},
                                      visitId: 'actual-navigation',
                                  },
                    }),
                );
            });

            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        },
    );

    it('does not show a skeleton for a prefetch-only visit', () => {
        vi.useFakeTimers();
        const getCached = vi.spyOn(router, 'getCached');
        renderBoundary();

        beforeVisit('prefetch-only', '/access/users', 'get', true);
        startVisit('prefetch-only', '/access/users', 'get', true);
        act(() => vi.advanceTimersByTime(300));

        expect(getCached).not.toHaveBeenCalled();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('removes the server boot fallback after the React provider mounts', () => {
        const fallback = document.createElement('div');
        fallback.id = 'page-loading-fallback';
        fallback.dataset.pageLoadingFamily = 'list';
        document.body.append(fallback);

        renderBoundary();

        expect(document.getElementById('page-loading-fallback')).toBeNull();
    });
});
