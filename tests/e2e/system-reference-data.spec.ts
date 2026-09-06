import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const e2eAdmin = {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'password',
};

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
    await page.goto('/user/confirm-password');
    await page
        .getByRole('textbox', { name: 'Password' })
        .fill(e2eAdmin.password);
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
        page.getByRole('columnheader', { name: 'Created', exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('columnheader', { name: 'Record status' }),
    ).toBeVisible();
    await expect(
        page.getByRole('columnheader', { name: 'Status', exact: true }),
    ).toHaveCount(0);

    const table = page.getByRole('table', { name: 'Country directory' });
    const projectOffset = ['mobile', 'tablet', 'desktop'].indexOf(
        testInfo.project.name,
    );
    const start = (Date.now() + projectOffset) % (26 * 26);
    const codes = Array.from({ length: 26 * 26 }, (_, index) => {
        const candidate = (start + index) % (26 * 26);

        return `${String.fromCharCode(65 + Math.floor(candidate / 26))}${String.fromCharCode(65 + (candidate % 26))}`;
    });
    const countryName = `Playwright ${testInfo.project.name} ${Date.now()}`;
    const updatedName = `${countryName} updated`;

    await page.getByRole('link', { name: 'Create country' }).click();
    await expect(page.getByLabel('Status', { exact: true })).toHaveCount(0);

    let created = false;
    for (const code of codes) {
        await page.locator('form').getByLabel('Country code').fill(code);
        await page
            .locator('form')
            .getByLabel('Name', { exact: true })
            .fill(countryName);
        await page.getByRole('button', { name: 'Create country' }).click();

        try {
            await expect(page).toHaveURL(/\/system\/countries$/, {
                timeout: 3000,
            });
            created = true;
            break;
        } catch {
            await expect(page).toHaveURL(/\/system\/countries\/create$/);
            await expect(
                page
                    .locator('form')
                    .getByText('The code has already been taken.', {
                        exact: true,
                    }),
            ).toBeVisible();
        }
    }

    expect(created).toBe(true);
    await page.goto(
        `/system/countries?search=${encodeURIComponent(countryName)}`,
    );

    let row = table.getByRole('row').filter({ hasText: countryName });
    await expect(row).toHaveCount(1);

    await row
        .getByRole('button', { name: `Actions for ${countryName}` })
        .click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page
        .locator('form')
        .getByLabel('Name', { exact: true })
        .fill(updatedName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/system\/countries$/);
    await page.goto(
        `/system/countries?search=${encodeURIComponent(updatedName)}`,
    );

    row = table.getByRole('row').filter({ hasText: updatedName });
    await expect(row).toHaveCount(1);
    await expect(
        row.getByRole('switch', {
            name: `Active record for ${updatedName}`,
        }),
    ).toHaveAttribute('aria-checked', 'true');

    await page.goto('/system/timezones');
    await expect(
        page.getByRole('heading', { name: 'Timezones' }),
    ).toBeVisible();
    await expect(
        page.getByRole('columnheader', { name: 'Created', exact: true }),
    ).toBeVisible();
    await page.goto('/system/timezones?search=Asia%2FManila');
    await expect(page.getByText('Asia/Manila').first()).toBeVisible();

    await page.goto('/settings/system');
    await expect(page.getByLabel('Time zone')).toContainText(
        /UTC|Asia\/Manila/,
    );
    await page.getByLabel('Time zone').click();
    await expect(
        page.getByRole('option', { name: 'Asia/Manila' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await page.goto(
        `/system/countries?search=${encodeURIComponent(updatedName)}`,
    );
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
    await expect(page).toHaveURL(/\/system\/countries(?:\?|$)/);

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.evaluate(() =>
        window.localStorage.setItem('appearance', 'dark'),
    );
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
