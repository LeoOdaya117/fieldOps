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

test('an administrator can manage user-table columns across themes and reloads', async ({
    page,
}) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await loginAsAdmin(page);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/access/users');

    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const userTable = page.getByRole('table', {
        name: 'FieldOps user accounts',
    });
    const userTableContainer = userTable.locator(
        'xpath=ancestor::*[@data-slot="data-table-container"]',
    );
    const manageColumns = userTableContainer.getByRole('button', {
        name: 'Manage columns',
    });

    await manageColumns.focus();
    await page.keyboard.press('Enter');

    const menu = page.getByRole('menu');
    const createdColumn = menu.getByRole('menuitemcheckbox', {
        name: 'Created',
    });

    await expect(menu).toBeVisible();
    await expect(createdColumn).toHaveAttribute('aria-checked', 'true');
    await createdColumn.focus();
    await page.keyboard.press('Space');
    await expect(createdColumn).toHaveAttribute('aria-checked', 'false');
    await expect(menu).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(
        userTable.getByRole('columnheader', { name: 'Created' }),
    ).toHaveCount(0);
    await expect(
        userTable.getByRole('checkbox', { name: 'Select all users' }),
    ).toBeVisible();
    await expect(
        userTable.getByRole('columnheader', { name: 'Actions' }),
    ).toBeVisible();

    await page.reload();
    const reloadedUserTable = page.getByRole('table', {
        name: 'FieldOps user accounts',
    });
    await expect(
        reloadedUserTable.getByRole('columnheader', { name: 'Created' }),
    ).toHaveCount(0);

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
});
