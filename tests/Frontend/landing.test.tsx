import type { AnchorHTMLAttributes, ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import {
    cleanup,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: unknown;
    children?: ReactNode;
};

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children, onClick, ...props }: MockLinkProps) => {
        const resolvedHref =
            typeof href === 'string'
                ? href
                : ((href as { url?: string }).url ?? String(href));

        return (
            <a
                href={resolvedHref}
                {...props}
                onClick={(event) => {
                    event.preventDefault();
                    onClick?.(event);
                }}
            >
                {children}
            </a>
        );
    },
    usePage: () => ({
        props: {
            name: 'FieldOps',
            auth: { user: null },
        },
    }),
}));

vi.mock('@/routes', () => ({
    dashboard: () => '/dashboard',
    home: () => '/',
    login: () => '/login',
    register: () => '/register',
}));

import { ScrollReveal } from '@/components/scroll-reveal';
import { LandingHeader } from '@/features/landing/components/landing-header';
import { LandingPage } from '@/features/landing/components/landing-page';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

afterEach(() => {
    cleanup();
});

describe('LandingPage', () => {
    it('renders the one-page product funnel in the intended order', () => {
        const { container } = render(<LandingPage isAuthenticated={false} />);

        expect(
            screen.getByRole('heading', {
                name: 'Keep every field job moving. From one clear view.',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Explore the platform' }),
        ).toHaveAttribute('href', '#tour');

        const sectionIds = [
            'top',
            'tour',
            'workflow',
            'offline',
            'outcomes',
            'faq',
            'start',
        ];
        const sections = sectionIds.map((id) =>
            container.querySelector(`#${id}`),
        );

        sections.forEach((section) => expect(section).not.toBeNull());
        sections.slice(1).forEach((section, index) => {
            expect(
                sections[index]?.compareDocumentPosition(section as Node) &
                    Node.DOCUMENT_POSITION_FOLLOWING,
            ).toBeTruthy();
        });
    });

    it('routes every guest conversion CTA to registration', () => {
        render(<LandingPage isAuthenticated={false} />);

        const startFreeLinks = screen.getAllByRole('link', {
            name: 'Start Free',
        });

        expect(startFreeLinks.length).toBeGreaterThanOrEqual(3);
        startFreeLinks.forEach((link) => {
            expect(link).toHaveAttribute('href', '/register');
        });
        expect(
            screen.getAllByRole('link', { name: 'Login' })[0],
        ).toHaveAttribute('href', '/login');
    });

    it('changes the guided tour with pointer and keyboard input', async () => {
        const user = userEvent.setup();
        render(<LandingPage isAuthenticated={false} />);

        const tour = screen.getByRole('tablist', {
            name: 'FieldOps product tour',
        });
        const dispatch = within(tour).getByRole('tab', { name: 'Dispatch' });
        const field = within(tour).getByRole('tab', {
            name: 'Field execution',
        });

        expect(dispatch).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('heading', {
                name: 'Turn incoming work into a clear plan.',
            }),
        ).toBeInTheDocument();

        await user.click(field);
        expect(field).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('heading', {
                name: 'Give crews one dependable place to work.',
            }),
        ).toBeInTheDocument();

        await user.keyboard('{ArrowRight}');
        expect(
            within(tour).getByRole('tab', { name: 'Map coordination' }),
        ).toHaveAttribute('aria-selected', 'true');
        expect(
            screen.getByRole('heading', {
                name: 'See where work is moving and where it is stuck.',
            }),
        ).toBeInTheDocument();
    });

    it('shows the workflow, offline state, outcomes, and FAQ', () => {
        render(<LandingPage isAuthenticated={false} />);

        expect(screen.getByText('01 / Assign')).toBeInTheDocument();
        expect(screen.getByText('06 / Resolve')).toBeInTheDocument();
        expect(screen.getByText('Connection unavailable')).toBeInTheDocument();
        expect(
            screen.getByText('Ready to sync when you’re back online.'),
        ).toBeInTheDocument();
        expect(screen.getByText('Clear ownership')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Can crews keep working without a reliable connection?',
            ),
        ).toBeInTheDocument();
    });

    it('routes authenticated actions to the dashboard', () => {
        render(<LandingPage isAuthenticated />);

        const dashboardLinks = screen.getAllByRole('link', {
            name: 'Open Dashboard',
        });

        expect(dashboardLinks.length).toBeGreaterThanOrEqual(3);
        dashboardLinks.forEach((link) => {
            expect(link).toHaveAttribute('href', '/dashboard');
        });
        expect(
            screen.queryByRole('link', { name: 'Start Free' }),
        ).not.toBeInTheDocument();
    });

    it('renders scroll reveals immediately without an intersection observer', async () => {
        render(
            <ScrollReveal>
                <span>Scroll content</span>
            </ScrollReveal>,
        );

        const reveal = screen.getByText('Scroll content').parentElement;
        expect(reveal).toHaveAttribute('data-scroll-reveal', 'true');
        await waitFor(() =>
            expect(reveal).toHaveAttribute('data-revealed', 'true'),
        );
    });
});

describe('LandingHeader', () => {
    it('exposes only one-page anchors in desktop navigation', () => {
        render(<LandingHeader isAuthenticated={false} />);

        const navigation = screen.getByRole('navigation', {
            name: 'Main navigation',
        });
        const expectedLinks = {
            'Product tour': '#tour',
            Workflow: '#workflow',
            Offline: '#offline',
            Outcomes: '#outcomes',
            FAQ: '#faq',
        };

        Object.entries(expectedLinks).forEach(([name, href]) => {
            expect(
                within(navigation).getByRole('link', { name }),
            ).toHaveAttribute('href', href);
        });
    });

    it('opens, closes, and follows the accessible mobile navigation', async () => {
        const user = userEvent.setup();
        render(<LandingHeader isAuthenticated={false} />);

        await user.click(screen.getByRole('button', { name: 'Open menu' }));
        const mobileNavigation = screen.getByRole('navigation', {
            name: 'Mobile navigation',
        });

        expect(
            screen.getByRole('button', { name: 'Close menu' }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(
            within(mobileNavigation).getByRole('link', {
                name: 'Product tour',
            }),
        ).toHaveAttribute('href', '#tour');

        await user.click(
            within(mobileNavigation).getByRole('link', { name: 'FAQ' }),
        );
        expect(
            screen.getByRole('button', { name: 'Open menu' }),
        ).toHaveAttribute('aria-expanded', 'false');
    });
});

describe('AuthSplitLayout', () => {
    it('renders page content with supplied artwork', () => {
        render(
            <AuthSplitLayout
                title="Create an account"
                description="Enter your details below"
                artwork={{
                    src: '/images/landing/field-worker-tablet-hd.png',
                    alt: 'Auth artwork',
                }}
            >
                <form aria-label="Registration form">
                    <input aria-label="Email address" />
                </form>
            </AuthSplitLayout>,
        );

        expect(
            screen.getByRole('heading', { name: 'Create an account' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('img', { name: 'Auth artwork' }),
        ).toHaveAttribute('src', '/images/landing/field-worker-tablet-hd.png');
        expect(
            screen.getByRole('form', { name: 'Registration form' }),
        ).toBeInTheDocument();
    });
});
