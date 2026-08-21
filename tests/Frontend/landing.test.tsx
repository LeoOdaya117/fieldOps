import type { AnchorHTMLAttributes, ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import {
    cleanup,
    fireEvent,
    render,
    screen,
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

import { LandingPage } from '@/features/landing/components/landing-page';
import { LandingHeader } from '@/features/landing/components/landing-header';
import { ScrollReveal } from '@/components/scroll-reveal';
import { MarketingHero } from '@/features/marketing/components/marketing-hero';
import { MarketingPage } from '@/features/marketing/components/marketing-page';
import { marketingPages } from '@/features/marketing/data';
import AuthSplitLayout from '@/layouts/auth/auth-split-layout';

afterEach(() => {
    cleanup();
});

describe('LandingPage', () => {
    it('renders the continuous guest operating journey and its local imagery', () => {
        render(<LandingPage isAuthenticated={false} />);

        expect(
            screen.getByRole('heading', {
                name: /One connected\s*system for every\s*job in the field\./i,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'See the workflow' }),
        ).toHaveAttribute('href', '#workflow');
        const startFreeLinks = screen.getAllByRole('link', {
            name: 'Start Free',
        });
        expect(startFreeLinks.length).toBeGreaterThan(0);
        startFreeLinks.forEach((link) => {
            expect(link).toHaveAttribute('href', '/register');
        });
        expect(
            screen.getByAltText(
                'FieldOps operations dashboard on a laptop beside a work-order phone',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByAltText(
                'Field worker reviewing a work order on a tablet beside a city waterway',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByAltText(
                'FieldOps mobile work order screen and completed work card',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                name: /The signal can drop\. The work doesn’t have to\./i,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                name: /Put the work on the map, then make the next move obvious\./i,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', {
                name: /See what moved\. Know what needs you next\./i,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByText('06 checkpoints connected'),
        ).toBeInTheDocument();
    });

    it('routes authenticated primary CTAs to the dashboard', () => {
        render(<LandingPage isAuthenticated />);

        const dashboardLinks = screen.getAllByRole('link', {
            name: 'Open Dashboard',
        });

        expect(dashboardLinks.length).toBeGreaterThan(0);
        dashboardLinks.forEach((link) => {
            expect(link).toHaveAttribute('href', '/dashboard');
        });
        expect(
            screen.queryByRole('link', { name: 'Start Free' }),
        ).not.toBeInTheDocument();
    });

    it('renders scroll reveals immediately when intersection observers are unavailable', () => {
        render(
            <ScrollReveal>
                <span>Scroll content</span>
            </ScrollReveal>,
        );

        const reveal = screen.getByText('Scroll content').parentElement;

        expect(reveal).toHaveAttribute('data-scroll-reveal', 'true');
        expect(reveal).toHaveAttribute('data-revealed', 'true');
    });

    it('opens and closes the accessible mobile navigation', async () => {
        const user = userEvent.setup();

        render(<LandingHeader isAuthenticated={false} />);

        await user.click(screen.getByRole('button', { name: 'Open menu' }));

        expect(
            screen.getByRole('button', { name: 'Close menu' }),
        ).toHaveAttribute('aria-expanded', 'true');
        const mobileNavigation = screen.getByRole('navigation', {
            name: 'Mobile navigation',
        });
        expect(mobileNavigation).toBeVisible();

        const pricingLink = within(mobileNavigation).getByRole('link', {
            name: 'Pricing',
        });
        expect(pricingLink).toHaveAttribute('href', '/pricing');

        await user.click(pricingLink);

        expect(
            screen.getByRole('button', { name: 'Open menu' }),
        ).toHaveAttribute('aria-expanded', 'false');
    });

    it('exposes journey anchors and login alongside the guest CTA', () => {
        render(<LandingHeader isAuthenticated={false} variant="journey" />);

        const mainNavigation = screen.getByRole('navigation', {
            name: 'Main navigation',
        });

        ['Platform', 'Offline', 'Mapping', 'Reporting'].forEach((label) => {
            expect(
                within(mainNavigation).getByRole('link', { name: label }),
            ).toHaveAttribute('href', `#${label.toLowerCase()}`);
        });
        expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute(
            'href',
            '/login',
        );
        expect(
            screen.getByRole('link', { name: 'Start Free' }),
        ).toHaveAttribute('href', '/register');
    });

    it('shows dashboard actions for authenticated users', () => {
        render(<LandingHeader isAuthenticated />);

        const dashboardLinks = within(screen.getByRole('banner')).getAllByRole(
            'link',
            {
                name: 'Dashboard',
            },
        );

        expect(dashboardLinks.length).toBeGreaterThan(0);
        dashboardLinks.forEach((link) => {
            expect(link).toHaveAttribute('href', '/dashboard');
        });
        expect(
            screen.queryByRole('link', { name: 'Get Started' }),
        ).not.toBeInTheDocument();
    });

    it('opens route-backed navigation menus with deeper links', async () => {
        render(<LandingHeader isAuthenticated={false} />);

        const mainNavigation = screen.getByRole('navigation', {
            name: 'Main navigation',
        });
        expect(
            within(mainNavigation).getByRole('link', { name: 'Features' }),
        ).toHaveAttribute('href', '/features');

        const featuresMenuButton = within(mainNavigation).getByRole('button', {
            name: 'Open Features menu',
        });
        fireEvent.click(featuresMenuButton);

        expect(featuresMenuButton).toHaveAttribute('aria-expanded', 'true');

        const featuresMenu = within(mainNavigation).getByRole('menu');
        expect(
            within(featuresMenu).getByRole('menuitem', {
                name: /Work Order Management/,
            }),
        ).toHaveAttribute('href', '/features#work-orders');
        [
            'Work Order Management',
            'Asset Management',
            'Reports & Analytics',
        ].forEach((label) => {
            expect(
                within(featuresMenu)
                    .getByRole('menuitem', {
                        name: new RegExp(label),
                    })
                    .querySelector('svg'),
            ).toBeInTheDocument();
        });

        const featuresMenuRoot = featuresMenuButton.closest('div.relative');
        expect(featuresMenuRoot).not.toBeNull();
        fireEvent.mouseLeave(featuresMenuRoot as HTMLDivElement);

        expect(featuresMenuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('renders the operational states in order', () => {
        render(<LandingPage isAuthenticated={false} />);

        const workflow = screen
            .getByText('FIELDOPS / WORKFLOW')
            .closest('section');

        expect(workflow).not.toBeNull();
        expect(
            within(workflow as HTMLElement).getByText('01 / Assign'),
        ).toBeInTheDocument();
        expect(
            within(workflow as HTMLElement).getByText('06 / Resolve'),
        ).toBeInTheDocument();
        expect(screen.getByText('Connection unavailable')).toBeInTheDocument();
        expect(
            screen.getByText('Ready to sync when you’re back online.'),
        ).toBeInTheDocument();
    });
});

describe('AuthSplitLayout', () => {
    it('renders page content with supplied artwork', () => {
        render(
            <AuthSplitLayout
                title="Create an account"
                description="Enter your details below"
                artwork={{
                    src: '/images/landing/field-worker-tablet.png',
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
        ).toHaveAttribute('src', '/images/landing/field-worker-tablet.png');
        expect(
            screen.getByRole('form', { name: 'Registration form' }),
        ).toBeInTheDocument();
    });
});

describe('MarketingHero', () => {
    it('keeps supplied hero artwork unframed and adds useful page context', () => {
        render(
            <MarketingHero
                config={marketingPages.features}
                isAuthenticated={false}
            />,
        );

        const heroImage = screen.getByAltText(
            'FieldOps dashboard on a laptop and mobile work order screen',
        );

        expect(heroImage.parentElement).not.toHaveClass(
            'border',
            'bg-card',
            'p-2',
        );
        expect(
            screen.getByText(
                'Keep the request, asset history, and completion record connected from the first assignment to the final report.',
            ),
        ).toBeInTheDocument();
    });

    it('uses page-specific pricing content instead of a generic product preview', () => {
        render(
            <MarketingHero
                config={marketingPages.pricing}
                isAuthenticated={false}
            />,
        );

        expect(
            screen.getByText('Choose your starting point'),
        ).toBeInTheDocument();
        expect(screen.getByText('Professional')).toBeInTheDocument();
        expect(screen.getByText('Popular')).toBeInTheDocument();
        expect(
            screen.queryByText('FieldOps product preview'),
        ).not.toBeInTheDocument();
    });

    it('keeps resource guidance visible as a focused path on the resources page', () => {
        render(
            <MarketingHero
                config={marketingPages.resources}
                isAuthenticated={false}
            />,
        );

        expect(screen.getByText('A useful next step')).toBeInTheDocument();
        expect(screen.getByText('Get started')).toBeInTheDocument();
        expect(screen.getByText('Get answers')).toBeInTheDocument();
    });

    it('adds industry-specific visual workflow examples', () => {
        render(
            <MarketingPage
                config={marketingPages.industries}
                isAuthenticated={false}
            />,
        );

        expect(
            screen.getByText('Example utility workflow'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Example construction workflow'),
        ).toBeInTheDocument();
        expect(screen.getByText('Example water workflow')).toBeInTheDocument();
        expect(
            screen.getByText('Request → dispatch → service history'),
        ).toBeInTheDocument();
    });

    it('keeps dedicated pages inside the shared marketing shell', () => {
        const { container } = render(
            <MarketingPage
                config={marketingPages.features}
                isAuthenticated={false}
            />,
        );

        expect(container.firstElementChild).toHaveClass('marketing-page-shell');
        expect(
            screen.getByRole('link', { name: 'Get Started' }),
        ).toHaveAttribute('href', '/register');
    });
});
