import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const e2eAdmin = {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'password',
};

const countryCodes = {
    mobile: 'XQ',
    tablet: 'XR',
    desktop: 'XS',
} as const;

async function loginAsAdmin(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(e2eAdmin.email);
    await page
        .getByRole('textbox', { name: 'Password' })
        .fill(e2eAdmin.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}

async function confirmAdminPassword(page: Page) {
    await page.goto('/password/confirm');
    await page.getByLabel('Password').fill(e2eAdmin.password);
    await page.getByRole('button', { name: 'Confirm password' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}

test('an administrator can manage reference data across themes, responsive layouts, and accessibility checks', async ({
    page,
}, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await loginAsAdmin(page);
    await confirmAdminPassword(page);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/system/countries');

    await expect(
        page.getByRole('heading', { name: 'Countries' }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Manage columns' }),
    ).toBeVisible();
    await expect(
        page.getByRole('columnheader', { name: 'Created' }),
    ).toBeVisible();
    await expect(
        page.getByRole('columnheader', { name: 'Record status' }),
    ).toBeVisible();
    await expect(
        page.getByRole('columnheader', { name: 'Status' }),
    ).toHaveCount(0);

    const table = page.getByRole('table', { name: 'Country directory' });
    const code =
        countryCodes[testInfo.project.name as keyof typeof countryCodes];
    const countryName = `Playwright ${testInfo.project.name}`;
    const updatedName = `${countryName} updated`;

    await page.getByRole('link', { name: 'Create country' }).click();
    await expect(page.getByLabel('Status', { exact: true })).toHaveCount(0);
    await page.getByLabel('Country code').fill(code);
    await page.getByLabel('Name', { exact: true }).fill(countryName);
    await page.getByRole('button', { name: 'Create country' }).click();
    await expect(page).toHaveURL(/\/system\/countries$/);

    let row = table.getByRole('row').filter({ hasText: countryName });
    await expect(row).toHaveCount(1);

    await row
        .getByRole('button', { name: `Actions for ${countryName}` })
        .click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Name', { exact: true }).fill(updatedName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/system\/countries$/);

    row = table.getByRole('row').filter({ hasText: updatedName });
    await expect(row).toHaveCount(1);
    await row
        .getByRole('switch', {
            name: `Active record for ${updatedName}`,
        })
        .toHaveAttribute('aria-checked', 'true');

    await page.goto('/system/timezones');
    await expect(
        page.getByRole('heading', { name: 'Timezones' }),
    ).toBeVisible();
    await expect(
        page.getByRole('columnheader', { name: 'Created' }),
    ).toBeVisible();
    await expect(page.getByText('Asia/Manila').first()).toBeVisible();

    await page.goto('/settings/system');
    await expect(page.getByLabel('Time zone')).toHaveValue('UTC');
    await expect(
        page.getByRole('option', { name: 'Asia/Manila' }),
    ).toBeAttached();

    await page.goto('/system/countries');
    row = page
        .getByRole('table', { name: 'Country directory' })
        .getByRole('row')
        .filter({
            hasText: updatedName,
        });
    await row
        .getByRole('button', { name: `Actions for ${updatedName}` })
        .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Delete' })
        .click();
    await expect(page).toHaveURL(/\/system\/countries$/);

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(
        page.getByRole('heading', { name: 'Countries' }),
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});
