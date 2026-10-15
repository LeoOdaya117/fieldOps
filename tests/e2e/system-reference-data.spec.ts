import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { e2eAccounts, login } from './support/auth';

async function confirmAdminPassword(page: Page) {
    await page.goto('/user/confirm-password');
    await page
        .getByRole('textbox', { name: 'Password' })
        .fill(e2eAccounts.admin.password);
    await page.getByRole('button', { name: 'Confirm password' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}

test('country Print and PDF follow the visible table columns', async ({
    page,
    context,
}) => {
    await login(page, e2eAccounts.admin);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/system/countries?search=Afghanistan');

    const table = page.getByRole('table', { name: 'Country directory' });
    const container = table.locator(
        'xpath=ancestor::*[@data-slot="data-table-container"]',
    );
    await expect(table.getByText('Afghanistan')).toBeVisible();
    await expect(table.getByRole('columnheader', { name: '#' })).toBeVisible();
    const browserDateSettings = await page.evaluate(() => {
        const { locale, timeZone } = Intl.DateTimeFormat().resolvedOptions();

        return { locale, timezone: timeZone };
    });

    await container.getByRole('button', { name: 'Columns' }).click();
    await page
        .getByRole('menuitemcheckbox', { name: 'Name', exact: true })
        .click();
    await page.keyboard.press('Escape');
    await expect(table.getByRole('columnheader', { name: 'Name' })).toHaveCount(
        0,
    );

    const selectedColumns = [
        'code',
        'record_status',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
    ];
    const exportButton = container.getByRole('button', {
        name: 'Export options',
    });

    await exportButton.click();
    const pdfRequestPromise = page.waitForRequest(
        (request) =>
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/exports/countries/pdf',
    );
    const pdfDownloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'PDF', exact: true }).click();
    const pdfRequest = await pdfRequestPromise;
    expect(pdfRequest.postDataJSON().columns).toEqual(selectedColumns);
    expect(pdfRequest.postDataJSON()).toMatchObject(browserDateSettings);
    const pdfDownload = await pdfDownloadPromise;
    expect(await pdfDownload.failure()).toBeNull();

    await exportButton.click();
    const printRequestPromise = page.waitForRequest(
        (request) =>
            request.method() === 'POST' &&
            new URL(request.url()).pathname === '/exports/countries/print',
    );
    const popupPromise = page.waitForEvent('popup');
    const printPdfRequestPromise = context.waitForEvent(
        'request',
        (request) =>
            request.method() === 'GET' &&
            /\/exports\/[^/]+\/print$/.test(new URL(request.url()).pathname),
    );
    await page.getByRole('menuitem', { name: 'Print' }).click();
    const printRequest = await printRequestPromise;
    expect(printRequest.postDataJSON().columns).toEqual(selectedColumns);
    expect(printRequest.postDataJSON()).toMatchObject(browserDateSettings);
    const printPopup = await popupPromise;
    const printPdfRequest = await printPdfRequestPromise;
    const printResponse = await context.request.get(printPdfRequest.url());
    expect(printResponse.ok()).toBe(true);
    expect(printResponse.headers()['content-type']).toContain(
        'application/pdf',
    );
    await printPopup.close();
});

test('an administrator can manage reference data across themes, responsive layouts, and accessibility checks', async ({
    page,
}, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await login(page, e2eAccounts.admin);
    await confirmAdminPassword(page);
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/system/countries');

    await expect(
        page.getByRole('heading', { name: 'Countries' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Columns' })).toBeVisible();
    await expect(
        page.getByRole('columnheader', {
            name: 'Sort Created ascending',
            exact: true,
        }),
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
            name: `Deactivate ${updatedName}`,
        }),
    ).toHaveAttribute('aria-checked', 'true');

    await row
        .getByRole('button', { name: `Actions for ${updatedName}` })
        .click();
    await page.getByRole('menuitem', { name: 'View' }).click();
    await expect(page).toHaveURL(/\/system\/countries\/\d+$/);
    await expect(page.locator('[data-slot="details-view"]')).toHaveCount(1);
    await expect(
        page.getByRole('heading', { name: 'Country definition' }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Audit history' }),
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
    await page.getByRole('link', { name: 'Back to countries' }).click();
    await expect(page).toHaveURL(/\/system\/countries(?:\?|$)/);
    row = page
        .getByRole('table', { name: 'Country directory' })
        .getByRole('row')
        .filter({ hasText: updatedName });

    await page.goto('/system/timezones');
    await expect(
        page.getByRole('heading', { name: 'Timezones' }),
    ).toBeVisible();
    await expect(
        page.getByRole('columnheader', {
            name: 'Sort Created ascending',
            exact: true,
        }),
    ).toBeVisible();
    await page.goto('/system/timezones?search=Asia%2FManila');
    await expect(page.getByText('Asia/Manila').first()).toBeVisible();
    const timezoneRow = page
        .getByRole('table', { name: 'Timezone directory' })
        .getByRole('row')
        .filter({ hasText: 'Asia/Manila' });
    await timezoneRow
        .getByRole('button', { name: 'Actions for Asia/Manila' })
        .click();
    await page.getByRole('menuitem', { name: 'View' }).click();
    await expect(page).toHaveURL(/\/system\/timezones\/\d+$/);
    await expect(page.locator('[data-slot="details-view"]')).toHaveCount(1);
    await expect(
        page.getByRole('heading', { name: 'Timezone definition' }),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Record status' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Back to timezones' }).click();
    await expect(page).toHaveURL(/\/system\/timezones(?:\?|$)/);

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
