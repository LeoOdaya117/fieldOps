import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const e2eUser = {
    email: process.env.E2E_USER_EMAIL ?? 'user@example.com',
    password: process.env.E2E_USER_PASSWORD ?? 'password',
};

async function login(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(e2eUser.email);
    await page
        .getByRole('textbox', { name: 'Password' })
        .fill(e2eUser.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
    await expect(
        page.getByRole('heading', { name: 'Good morning, team.' }),
    ).toBeVisible();
}

test('the one-page product funnel is readable, responsive, and accessible', async ({
    page,
}) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await expect(page).toHaveTitle(/FieldOps/);
    await expect(
        page.getByRole('heading', {
            name: 'Keep every field job moving. From one clear view.',
        }),
    ).toBeVisible();
    await expect(
        page.getByRole('link', { name: 'Explore the platform' }),
    ).toHaveAttribute('href', '#tour');
    await expect(
        page.getByAltText(
            'FieldOps operations dashboard on a laptop beside a work-order phone',
        ),
    ).toBeVisible();

    const menuButton = page.getByRole('button', { name: 'Open menu' });

    if (await menuButton.isVisible()) {
        await menuButton.click();
        const mobileNavigation = page.getByRole('navigation', {
            name: 'Mobile navigation',
        });
        await expect(
            mobileNavigation.getByRole('link', { name: 'Sign in' }),
        ).toBeVisible();
        await expect(
            mobileNavigation.getByRole('link', { name: 'Product tour' }),
        ).toHaveAttribute('href', '#tour');
    } else {
        await expect(
            page.locator('header').getByRole('link', { name: 'Sign in' }),
        ).toBeVisible();
        await expect(
            page.locator('header').getByRole('link', { name: 'Workflow' }),
        ).toHaveAttribute('href', '#workflow');
    }

    await expect(
        page.getByRole('heading', {
            name: 'Straight answers for an operation in motion.',
        }),
    ).toBeAttached();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});

test('the guided tour supports pointer and keyboard navigation', async ({
    page,
}) => {
    await page.goto('/#tour');

    const tabs = page.getByRole('tablist', { name: 'FieldOps product tour' });
    const fieldTab = tabs.getByRole('tab', { name: 'Field execution' });
    await fieldTab.click();
    await expect(fieldTab).toHaveAttribute('aria-selected', 'true');
    await expect(
        page.getByRole('heading', {
            name: 'Give crews one dependable place to work.',
        }),
    ).toBeVisible();

    await page.keyboard.press('ArrowRight');
    const mapTab = tabs.getByRole('tab', { name: 'Map coordination' });
    await expect(mapTab).toBeFocused();
    await expect(mapTab).toHaveAttribute('aria-selected', 'true');
    await expect(
        page.getByRole('heading', {
            name: 'See where work is moving and where it is stuck.',
        }),
    ).toBeVisible();
});

test('the funnel respects dark mode and reduced motion', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(
        page.getByRole('heading', {
            name: 'The signal can drop. The work does not have to.',
        }),
    ).toBeAttached();

    const tourLink = page.getByRole('link', { name: 'Product tour' }).first();
    await tourLink.focus();
    await expect(tourLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#tour$/);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});

test('removed marketing URLs return not found', async ({ request }) => {
    for (const path of [
        '/features',
        '/solutions',
        '/industries',
        '/pricing',
        '/resources',
        '/about',
    ]) {
        const response = await request.get(path);
        expect(response.status()).toBe(404);
    }
});

test('login and invitation links keep the landing visual language', async ({
    page,
}) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login');
    await expect(
        page.getByRole('heading', { name: 'Log in to your account' }),
    ).toBeVisible();
    await expect(
        page.getByAltText(
            'Field worker checking a service van beside a city water tower',
        ),
    ).toBeAttached();

    await page.goto('/invitations/not-a-real-token');
    await expect(
        page.getByRole('heading', { name: 'Invitation unavailable' }),
    ).toBeVisible();
});

test('an authenticated user can use the dashboard and theme settings', async ({
    page,
}) => {
    await login(page);

    const dashboardAccessibility = await new AxeBuilder({ page }).analyze();
    expect(dashboardAccessibility.violations).toEqual([]);

    await page.goto('/settings/appearance');
    await page.getByRole('button', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
});
