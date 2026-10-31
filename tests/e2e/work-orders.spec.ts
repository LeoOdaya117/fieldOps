import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { e2eAccounts, login } from './support/auth';

test('an authorized user can create, edit, review, and cancel a standalone work order', async ({
    page,
}, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await login(page, e2eAccounts.owner);
    await page.evaluate(() => window.localStorage.clear());

    const suffix = `${testInfo.project.name}-${Date.now()}`.toUpperCase();
    const reference = `E2E-WO-${suffix}`;
    const title = `Playwright work order ${suffix}`;
    const updatedTitle = `${title} updated`;
    const dueDate = new Date(Date.now() + 86_400_000)
        .toISOString()
        .slice(0, 10);

    await page.goto('/work-orders');
    await expect(
        page.getByRole('heading', { name: 'Work orders' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Create work order' }).click();
    await expect(
        page.getByRole('heading', { name: 'Create work order' }),
    ).toBeVisible();

    await page.getByLabel('Work-order reference').fill(reference.toLowerCase());
    await page.getByLabel('Title').fill(title);
    const priority = page.getByLabel('Priority');
    await priority.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.getByLabel('Due date').fill(dueDate);
    await page.getByLabel('Asset (optional)').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page
        .getByRole('textbox', { name: 'Standalone location' })
        .fill('North access road, Gate 2');
    await page
        .getByLabel('Instructions')
        .fill('Inspect the drainage cover and clear debris.');
    await page.getByLabel('Latitude').fill('12.8797');
    await page.getByLabel('Longitude').fill('121.774');
    await page.getByRole('button', { name: 'Create work order' }).click();

    await expect(page).toHaveURL(/\/work-orders\/\d+$/);
    await expect(
        page.getByRole('heading', { name: 'Work details' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: reference })).toBeVisible();
    await expect(page.getByText('12.879700')).toBeVisible();
    await expect(page.getByText('121.774000')).toBeVisible();
    expect(await new AxeBuilder({ page }).analyze()).toMatchObject({
        violations: [],
    });

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.evaluate(() =>
        window.localStorage.setItem('appearance', 'dark'),
    );
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('link', { name: 'Edit' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByLabel('Title').fill(updatedTitle);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page).toHaveURL(/\/work-orders\/\d+$/);
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByText(updatedTitle)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel work order' }).click();
    const cancelRequestPromise = page.waitForRequest(
        (request) =>
            request.method() === 'PATCH' &&
            new URL(request.url()).pathname.endsWith('/cancel'),
    );
    await page
        .getByRole('button', { name: 'Cancel work order', exact: true })
        .last()
        .click();
    expect((await cancelRequestPromise).postDataJSON()).toMatchObject({
        version: 2,
    });
    await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Cancel work order' }),
    ).toHaveCount(0);

    await page.goto(
        `/work-orders?search=${encodeURIComponent(`${reference}-missing`)}`,
    );
    await expect(
        page.getByText('No work orders match the current filters.'),
    ).toBeVisible();

    await page.goto(`/work-orders?search=${encodeURIComponent(reference)}`);
    const row = page.getByRole('row').filter({ hasText: updatedTitle });
    await expect(row).toHaveCount(1);
    await expect(row.getByText('Cancelled')).toBeVisible();
    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
    expect(await new AxeBuilder({ page }).analyze()).toMatchObject({
        violations: [],
    });
});
