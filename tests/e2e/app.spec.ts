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
    await page.getByRole('textbox', { name: 'Password' }).fill(e2eUser.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
    await expect(
        page.getByRole('heading', { name: 'Good morning, team.' }),
    ).toBeVisible();
}

test('the welcome page is readable and responsive', async ({ page }) => {
    await page.goto('/');

    await expect(
        page.getByRole('heading', {
            name: 'Make every field day feel under control.',
        }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});

test('the application respects a dark system preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByText('Today in the field')).toBeVisible();
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
