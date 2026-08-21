import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const e2eUser = {
    email: process.env.E2E_USER_EMAIL ?? 'test@example.com',
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

test('the welcome page is readable and responsive', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    await expect(page).toHaveTitle(/FieldOps/);

    await expect(
        page.getByRole('heading', {
            name: /One connected\s*system for every\s*job in the field\./,
        }),
    ).toBeVisible();
    await expect(
        page.getByAltText(
            'FieldOps operations dashboard on a laptop beside a work-order phone',
        ),
    ).toBeVisible();
    await expect(
        page.getByAltText(
            'FieldOps mobile work order screen and completed work card',
        ),
    ).toBeAttached();

    const menuButton = page.getByRole('button', { name: 'Open menu' });

    if (await menuButton.isVisible()) {
        await menuButton.click();
        const mobileNavigation = page.getByRole('navigation', {
            name: 'Mobile navigation',
        });
        await expect(
            mobileNavigation.getByRole('link', { name: 'Start Free' }),
        ).toBeVisible();
        await expect(
            mobileNavigation.getByRole('link', { name: 'Offline' }),
        ).toHaveAttribute('href', '#offline');
    } else {
        await expect(
            page.locator('header').getByRole('link', { name: 'Start Free' }),
        ).toBeVisible();
        await expect(
            page.locator('header').getByRole('link', { name: 'Mapping' }),
        ).toHaveAttribute('href', '#mapping');
    }

    await expect(
        page.getByRole('heading', {
            name: /See what moved\. Know what needs you next\./i,
        }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});

test('the application respects a dark system preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(
        page.getByRole('heading', {
            name: /One connected\s*system for every\s*job in the field\./,
        }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', {
            name: /The signal can drop\. The work doesn’t have to\./i,
        }),
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});

test('the homepage stays contained and keyboard-friendly with reduced motion', async ({
    page,
}) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/');

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);

    const offlineLink = page.getByRole('link', { name: 'Offline' }).first();
    await offlineLink.focus();
    await expect(offlineLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#offline$/);

    expect(
        await page
            .locator('.landing-route-line')
            .first()
            .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe('none');
});

test('marketing navigation opens dedicated detail pages', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });

    const pages = [
        {
            path: '/features',
            heading: 'One connected system for every part of field operations.',
        },
        {
            path: '/solutions',
            heading:
                'Give every crew a clear next move and every leader a clear view.',
        },
        {
            path: '/industries',
            heading:
                'Flexible enough for your industry. Focused enough for your day.',
        },
        {
            path: '/pricing',
            heading: 'Start focused. Scale when your operation is ready.',
        },
        {
            path: '/resources',
            heading:
                'Make every rollout easier to understand, adopt, and improve.',
        },
        {
            path: '/about',
            heading:
                'The operating layer for teams that keep the world moving.',
        },
    ];

    for (const marketingPage of pages) {
        await page.goto(marketingPage.path);
        await expect(page).toHaveURL(new RegExp(`${marketingPage.path}$`));
        await expect(
            page.getByRole('heading', { name: marketingPage.heading }),
        ).toBeVisible();
    }

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});

test('login and registration use the landing visual language', async ({
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

    await page.goto('/register');
    await expect(
        page.getByRole('heading', { name: 'Create an account' }),
    ).toBeVisible();
    await expect(
        page.getByAltText('Field worker reviewing a work order on a tablet'),
    ).toBeAttached();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});

test('an authenticated user can use the dashboard and theme settings', async ({
    page,
}) => {
    await login(page);

    await expect(
        page.getByRole('heading', { name: 'Good morning, team.' }),
    ).toBeVisible();

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
