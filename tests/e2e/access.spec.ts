import { expect, test } from '@playwright/test';
import { e2eAccounts, login } from './support/auth';

test('an administrator can manage audit columns across access tables and themes', async ({
    page,
}, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await login(page, e2eAccounts.admin);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/access/users');

    if (testInfo.project.name === 'tablet') {
        const sidebarToggle = page.getByRole('button', {
            name: /toggle sidebar/i,
        });

        if (await sidebarToggle.isVisible()) {
            await sidebarToggle.click();
        }
    }

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
    const filterDialog = page.getByRole('dialog', {
        name: 'Search and filter users',
    });
    await expect(filterDialog.getByLabel('Date range')).toBeVisible();
    await expect(filterDialog.getByLabel('Created by')).toHaveCount(0);
    await expect(filterDialog.getByLabel('Updated by')).toHaveCount(0);
    await expect(
        filterDialog.getByRole('group', { name: 'Record status' }),
    ).toBeVisible();
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
            name: 'Sort Updated ascending',
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
    await expect(page).toHaveURL(
        (url) =>
            url.pathname === '/access/users' &&
            url.searchParams.get('sort') === 'created_by' &&
            url.searchParams.get('direction') === 'asc',
    );

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
                    name: 'Sort Created ascending',
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                table.getByRole('columnheader', {
                    name: 'Sort Updated ascending',
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
                (url) =>
                    url.pathname === surface.path &&
                    url.searchParams.get('sort') === 'updated_at' &&
                    url.searchParams.get('direction') === 'asc',
            );

            await page.getByRole('button', { name: /Filter/ }).click();
            const filterDialog = page.getByRole('dialog');
            await expect(filterDialog.getByLabel('Date range')).toBeVisible();
            await expect(filterDialog.getByLabel('Created by')).toHaveCount(0);
            await expect(filterDialog.getByLabel('Updated by')).toHaveCount(0);
            await expect(
                filterDialog.getByRole('group', { name: 'Record status' }),
            ).toBeVisible();
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

test('an administrator can export CSV and open a print popup that invokes the browser print dialog', async ({
    page,
    context,
}) => {
    await context.addInitScript(() => {
        const printWindow = window as Window & {
            __fieldOpsPrintCalled?: boolean;
        };
        printWindow.__fieldOpsPrintCalled = false;
        window.print = () => {
            printWindow.__fieldOpsPrintCalled = true;
        };
    });

    await login(page, e2eAccounts.admin);
    await page.goto('/access/users');

    const userTable = page.getByRole('table', {
        name: 'FieldOps user accounts',
    });
    const userTableContainer = userTable.locator(
        'xpath=ancestor::*[@data-slot="data-table-container"]',
    );
    const exportButton = userTableContainer.getByRole('button', {
        name: 'Export options',
    });

    await expect(exportButton).toBeVisible();
    await userTableContainer.getByRole('button', { name: /Filter/ }).click();
    const filterDialog = page.getByRole('dialog', {
        name: 'Search and filter users',
    });
    await filterDialog.getByLabel('Search users').fill(e2eAccounts.admin.email);
    const filteredUsers = page.waitForResponse((response) => {
        const url = new URL(response.url());

        return (
            response.request().method() === 'GET' &&
            url.pathname === '/access/users' &&
            url.searchParams.get('search') === e2eAccounts.admin.email
        );
    });
    await filterDialog.getByRole('button', { name: 'Apply filters' }).click();
    await filteredUsers;
    await expect(
        userTable.getByText(e2eAccounts.admin.email, { exact: true }),
    ).toBeVisible();
    await expect(exportButton).toBeVisible();

    await exportButton.focus();
    await page.keyboard.press('Enter');

    const menu = page.getByRole('menu');

    for (const label of ['PDF', 'CSV', 'Excel (.xlsx)', 'Print']) {
        await expect(menu.getByRole('menuitem', { name: label })).toBeVisible();
    }

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await exportButton.click();
    const csvDownloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'CSV' }).click();
    const csvDownload = await csvDownloadPromise;

    expect(csvDownload.suggestedFilename()).toMatch(/users-export-\d{8}\.csv$/);
    const exportToast = page
        .locator('[data-sonner-toast]')
        .filter({ hasText: 'Your export is ready.' });
    await expect(exportToast).toBeVisible();
    await expect(
        userTableContainer.getByText('Your export is ready.'),
    ).toHaveCount(0);
    expect(await csvDownload.failure()).toBeNull();
    await expect(
        userTableContainer.getByRole('link', { name: 'Download CSV' }),
    ).toHaveCount(0);
    await expect(
        userTableContainer.getByRole('button', { name: 'Columns' }),
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);

    await exportButton.click();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('menuitem', { name: 'Print' }).click();
    const printPopup = await popupPromise;

    await expect(printPopup).toHaveURL(/\/exports\/[^/]+\/print$/);
    await expect(
        printPopup.getByRole('button', { name: 'Print report' }),
    ).toBeVisible();
    await expect
        .poll(() =>
            printPopup.evaluate(() => {
                const printWindow = window as Window & {
                    __fieldOpsPrintCalled?: boolean;
                };

                return printWindow.__fieldOpsPrintCalled === true;
            }),
        )
        .toBe(true);
    await printPopup.close();

    for (const appearance of ['light', 'dark'] as const) {
        await page.evaluate((mode) => {
            window.localStorage.setItem('appearance', mode);
        }, appearance);
        await page.reload();

        if (appearance === 'dark') {
            await expect(page.locator('html')).toHaveClass(/dark/);
        } else {
            await expect(page.locator('html')).not.toHaveClass(/dark/);
        }

        const themedExportButton = userTableContainer.getByRole('button', {
            name: 'Export options',
        });
        await expect(themedExportButton).toBeVisible();
        await themedExportButton.click();
        await expect(page.getByRole('menu')).toBeVisible();
        await page.keyboard.press('Escape');
    }
});
