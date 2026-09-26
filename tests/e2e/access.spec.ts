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

test('an administrator can manage audit columns across access tables and themes', async ({
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
    await expect(
        userTableContainer.getByRole('button', { name: /Filter/ }),
    ).toBeVisible();
    await userTableContainer.getByRole('button', { name: /Filter/ }).click();
    await expect(page.getByLabel('Date range')).toBeVisible();
    await expect(page.getByLabel('Created by')).toHaveCount(0);
    await expect(page.getByLabel('Updated by')).toHaveCount(0);
    await expect(
        page.getByRole('group', { name: 'Record status' }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(
        userTableContainer.getByRole('link', { name: 'Add user' }),
    ).toHaveAttribute('href', '/access/users/create');
    const manageColumns = userTableContainer.getByRole('button', {
        name: 'Columns',
    });

    await manageColumns.focus();
    await page.keyboard.press('Enter');

    const menu = page.getByRole('menu');
    const createdColumn = menu.getByRole('menuitemcheckbox', {
        name: 'Created',
        exact: true,
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
        userTable.getByRole('columnheader', {
            name: 'Created',
            exact: true,
        }),
    ).toHaveCount(0);
    await expect(
        userTable.getByRole('checkbox', { name: 'Select all users' }),
    ).toBeVisible();
    await expect(
        userTable.getByRole('columnheader', { name: 'Actions' }),
    ).toBeVisible();
    await expect(
        userTable.getByRole('columnheader', {
            name: 'Updated',
            exact: true,
        }),
    ).toBeVisible();
    await expect(
        userTable.getByRole('columnheader', { name: 'Created by' }),
    ).toBeVisible();
    await expect(
        userTable.getByRole('columnheader', { name: 'Updated by' }),
    ).toBeVisible();
    await expect(
        userTable.getByRole('columnheader', { name: 'Record status' }),
    ).toBeVisible();
    await userTable
        .getByRole('link', { name: 'Sort Created by ascending' })
        .click();
    await expect(page).toHaveURL(/\/access\/users\?sort=created_by&direction=asc/);

    await page.reload();
    const reloadedUserTable = page.getByRole('table', {
        name: 'FieldOps user accounts',
    });
    await expect(
        reloadedUserTable.getByRole('columnheader', {
            name: 'Created',
            exact: true,
        }),
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

    const surfaces = [
        {
            path: '/access/roles',
            heading: 'Roles',
            table: 'FieldOps role catalog',
        },
        {
            path: '/access/ip-blocks',
            heading: 'Blocked IP addresses',
            table: 'IP address access records',
        },
    ];

    for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });

        if (colorScheme === 'dark') {
            await expect(page.locator('html')).toHaveClass(/dark/);
        } else {
            await expect(page.locator('html')).not.toHaveClass(/dark/);
        }

        for (const surface of surfaces) {
            await page.goto(surface.path);
            await expect(
                page.getByRole('heading', { name: surface.heading }),
            ).toBeVisible();

            const table = page.getByRole('table', { name: surface.table });
            await expect(
                table.getByRole('columnheader', {
                    name: 'Created',
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                table.getByRole('columnheader', {
                    name: 'Updated',
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                table.getByRole('columnheader', { name: 'Created by' }),
            ).toBeVisible();
            await expect(
                table.getByRole('columnheader', { name: 'Updated by' }),
            ).toBeVisible();
            await expect(
                table.getByRole('columnheader', { name: 'Record status' }),
            ).toBeVisible();

            await table
                .getByRole('link', { name: 'Sort Updated ascending' })
                .click();
            await expect(page).toHaveURL(
                new RegExp(
                    `${surface.path.replace('/', '\\/')}\\?sort=updated_at&direction=asc`,
                ),
            );

            await page.getByRole('button', { name: /Filter/ }).click();
            await expect(page.getByLabel('Date range')).toBeVisible();
            await expect(page.getByLabel('Created by')).toHaveCount(0);
            await expect(page.getByLabel('Updated by')).toHaveCount(0);
            await expect(
                page.getByRole('group', { name: 'Record status' }),
            ).toHaveCount(0);
            await page.keyboard.press('Escape');

            const scrollContainer = table.locator(
                'xpath=ancestor::*[@data-slot="data-table-scroll-container"]',
            );
            await expect(scrollContainer).toHaveClass(/overflow-x-auto/);

            await page.getByRole('button', { name: 'Columns' }).click();
            await expect(
                page.getByRole('menuitemcheckbox', { name: 'Created by' }),
            ).toHaveAttribute('aria-checked', 'true');
            await page.keyboard.press('Escape');
        }
    }
});
