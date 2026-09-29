import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { e2eAccounts, login } from './support/auth';

test('tokenized file upload, preview, download and lifecycle work across device widths', async ({
    page,
}, testInfo) => {
    await page.emulateMedia({
        colorScheme: testInfo.project.name === 'tablet' ? 'dark' : 'light',
        reducedMotion: 'reduce',
    });
    await login(page, e2eAccounts.admin);
    await page.goto('/files');
    await expect(
        page.getByRole('heading', { name: 'Files', exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-slot="data-table"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter/ })).toBeVisible();
    const indexLayout = await page
        .locator('[data-slot="index-page"]')
        .evaluate((element) => ({
            paddingLeft: Number.parseFloat(
                getComputedStyle(element).paddingLeft,
            ),
            paddingRight: Number.parseFloat(
                getComputedStyle(element).paddingRight,
            ),
        }));
    expect(indexLayout.paddingLeft).toBeGreaterThanOrEqual(16);
    expect(indexLayout.paddingRight).toBeGreaterThanOrEqual(16);
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
    ).toBe(true);
    mkdirSync(path.resolve('.impeccable/review'), { recursive: true });
    await page.screenshot({
        path: path.resolve(
            '.impeccable/review',
            `files-index-${testInfo.project.name}.png`,
        ),
        fullPage: true,
    });

    const name = `e2e-${testInfo.project.name}-${Date.now()}.csv`;
    await page.locator('input[type="file"]').setInputFiles({
        name,
        mimeType: 'text/csv',
        buffer: Buffer.from('name,value\nalpha,42\n'),
    });
    await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(/\/files\/[A-Za-z0-9]+$/);
    await expect(page.locator('[data-slot="details-page"]')).toBeVisible();
    await expect(page.locator('[data-slot="details-view"]')).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'File details' }),
    ).toBeVisible();
    const detailLayout = await page
        .locator('[data-slot="details-page"]')
        .evaluate((element) => ({
            paddingLeft: Number.parseFloat(
                getComputedStyle(element).paddingLeft,
            ),
            paddingRight: Number.parseFloat(
                getComputedStyle(element).paddingRight,
            ),
        }));
    expect(detailLayout.paddingLeft).toBeGreaterThanOrEqual(16);
    expect(detailLayout.paddingRight).toBeGreaterThanOrEqual(16);
    await expect(
        page.getByRole('region', { name: 'First rows of file' }),
    ).toContainText('alpha');
    await page.screenshot({
        path: path.resolve(
            '.impeccable/review',
            `files-${testInfo.project.name}.png`,
        ),
        fullPage: true,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(name);

    await page.getByRole('switch', { name: `Deactivate ${name}` }).click();
    await page.getByRole('button', { name: 'Inactive', exact: true }).click();
    await expect(
        page.getByRole('switch', { name: `Activate ${name}` }),
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
});
