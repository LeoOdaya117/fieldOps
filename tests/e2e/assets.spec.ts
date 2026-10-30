import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { e2eAccounts, login } from './support/auth';

async function confirmOwnerPassword(page: Page) {
    await page.goto('/user/confirm-password');
    await page
        .getByRole('textbox', { name: 'Password' })
        .fill(e2eAccounts.owner.password);
    await page.getByRole('button', { name: 'Confirm password' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}

test('an administrator can create, edit, and review an asset across themes and viewports', async ({
    page,
}, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await login(page, e2eAccounts.owner);
    await confirmOwnerPassword(page);
    await page.evaluate(() => window.localStorage.clear());

    const code = `E2E-${testInfo.project.name}-${Date.now()}`.toUpperCase();
    const name = `Playwright asset ${testInfo.project.name} ${Date.now()}`;
    const updatedName = `${name} updated`;

    await page.goto('/assets');
    await expect(page.getByRole('heading', { name: 'Assets' })).toBeVisible();
    await page.getByRole('link', { name: 'Create asset' }).click();
    await expect(
        page.getByRole('heading', { name: 'Create asset' }),
    ).toBeVisible();

    await page.getByLabel('Asset code').fill(code.toLowerCase());
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByLabel('Category').fill('Pump');
    await page.getByLabel('Operational condition').click();
    await page.getByRole('option', { name: 'Needs maintenance' }).click();
    await page.getByLabel('Latitude').fill('12.8797');
    await page.getByLabel('Longitude').fill('121.774');
    await page.getByRole('button', { name: 'Create asset' }).click();
    await expect(page).toHaveURL(/\/assets\/\d+$/);

    const table = page.getByRole('table', { name: 'Asset directory' });
    await page.goto(`/assets?search=${encodeURIComponent(code)}`);
    let row = table.getByRole('row').filter({ hasText: name });
    await expect(row).toHaveCount(1);
    await expect(row.getByText(code)).toBeVisible();
    await row.getByRole('button', { name: `Actions for ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
    await page.getByLabel('Name', { exact: true }).fill(updatedName);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/assets\/\d+$/);
    await expect(
        page.getByRole('heading', { name: updatedName, level: 2 }),
    ).toBeVisible();

    await page.goto(`/assets?search=${encodeURIComponent(code)}`);
    row = table.getByRole('row').filter({ hasText: updatedName });
    await expect(row).toHaveCount(1);
    await row
        .getByRole('button', { name: `Actions for ${updatedName}` })
        .click();
    await page.getByRole('menuitem', { name: 'View' }).click();
    await expect(page).toHaveURL(/\/assets\/\d+$/);
    await expect(page.locator('[data-slot="details-view"]')).toHaveCount(1);
    await expect(
        page.getByRole('heading', { name: 'Asset definition' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Location' })).toBeVisible();
    await expect(page.getByText('12.879700')).toBeVisible();
    await expect(page.getByText('121.774000')).toBeVisible();
    await expect(page.getByText('Needs maintenance')).toBeVisible();

    const evidenceName = `evidence-${testInfo.project.name}-${Date.now()}.csv`;
    await page.getByLabel('Add evidence files').setInputFiles({
        name: evidenceName,
        mimeType: 'text/csv',
        buffer: Buffer.from('item,result\npump,checked\n'),
    });
    await page.getByRole('button', { name: 'Upload' }).click();
    const evidenceSection = page.getByRole('region', {
        name: 'Evidence files',
    });
    const evidenceRow = evidenceSection
        .getByRole('listitem')
        .filter({ hasText: evidenceName });
    await expect(evidenceRow).toBeVisible();
    await expect(
        page.getByText('Evidence Attached', { exact: true }),
    ).toBeVisible();
    await evidenceRow.getByRole('button', { name: 'Preview rows' }).click();
    await expect(
        page.getByRole('region', { name: 'First rows of evidence' }),
    ).toContainText('pump');
    await expect(
        page.getByRole('region', { name: 'First rows of evidence' }),
    ).toContainText('checked');

    const downloadPromise = page.waitForEvent('download');
    await evidenceRow.getByRole('link', { name: 'Download' }).click();
    expect((await downloadPromise).suggestedFilename()).toBe(evidenceName);

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.evaluate(() =>
        window.localStorage.setItem('appearance', 'dark'),
    );
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(
        evidenceSection.getByRole('listitem').filter({ hasText: evidenceName }),
    ).toBeVisible();
    await expect(
        page.getByText('Evidence Attached', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: `Remove ${evidenceName}` }).click();
    await expect(
        page.getByText('Evidence Removed', { exact: true }),
    ).toBeVisible();
    await expect(
        evidenceSection.getByRole('listitem').filter({ hasText: evidenceName }),
    ).toHaveCount(0);

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(
        page.getByRole('heading', { name: updatedName, level: 2 }),
    ).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
});
