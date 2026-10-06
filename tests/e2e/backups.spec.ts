import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { e2eAccounts, login } from './support/auth';

const base = '/settings/system/backups';

async function confirmPassword(page: Page) {
    await page.goto('/user/confirm-password');
    await page
        .getByRole('textbox', { name: 'Password' })
        .fill(e2eAccounts.owner.password);
    await page.getByRole('button', { name: 'Confirm password' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
}

async function checkAppearances(
    page: Page,
    testInfo: TestInfo,
    surface: string,
) {
    for (const dark of [false, true]) {
        await page.evaluate(
            (enabled) =>
                document.documentElement.classList.toggle('dark', enabled),
            dark,
        );
        expect(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
            [],
        );
        const appearance = dark ? 'dark' : 'light';
        const screenshot = testInfo.outputPath(
            `backups-${surface}-${testInfo.project.name}-${appearance}.png`,
        );
        await page.screenshot({ path: screenshot, fullPage: true });
        await testInfo.attach(`Backup ${surface} ${appearance}`, {
            path: screenshot,
            contentType: 'image/png',
        });
    }
}

test('dedicated backup inventory, creation and audit are accessible in both appearances', async ({
    page,
}, testInfo) => {
    await login(page, e2eAccounts.owner);
    await page.goto(base);
    await expect(
        page.getByRole('heading', { name: 'Backup & Restore', exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('table', { name: 'Saved database backups' }),
    ).toBeVisible();
    await checkAppearances(page, testInfo, 'inventory');
    await page
        .getByRole('link', { name: 'Create backup', exact: true })
        .click();
    await expect(
        page.getByRole('heading', { name: 'Create backup', exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('radio', { name: /^Full database/ }),
    ).toBeChecked();
    await page.getByRole('radio', { name: /^Selected tables/ }).click();
    await expect(
        page.getByRole('group', { name: 'Available database tables' }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Create backup', exact: true }),
    ).toBeDisabled();
    await expect(
        page.getByText(/Restore replaces this entire recorded selection/),
    ).toBeVisible();
    await checkAppearances(page, testInfo, 'create');
    await page.getByLabel('Backup package').setInputFiles({
        name: 'unsafe.sql',
        mimeType: 'text/plain',
        buffer: Buffer.from('SELECT 1;'),
    });
    await expect(
        page
            .getByRole('alert')
            .filter({ hasText: 'Choose a .fieldops or .zip package' }),
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Upload package', exact: true }),
    ).toBeDisabled();
    await page.goto(`${base}/audit`);
    await expect(
        page.getByRole('table', { name: 'Backup audit events' }),
    ).toBeVisible();
    await checkAppearances(page, testInfo, 'audit');
});

test('ordinary administrators cannot open backup pages or see navigation', async ({
    page,
}) => {
    await login(page, e2eAccounts.admin);

    for (const path of [base, `${base}/create`, `${base}/audit`]) {
        expect((await page.goto(path))?.status()).toBe(403);
    }

    await page.goto('/settings/system');
    await expect(
        page.getByRole('link', { name: 'Backup & Restore' }),
    ).toHaveCount(0);
});

test.describe('supervised backup runner', () => {
    test.describe.configure({ retries: 0 });
    test('creates a related-table package with provenance, upload, guarded restore and retained deletion audit', async ({
        page,
    }, testInfo) => {
        test.skip(
            process.env.E2E_BACKUPS_RUNNER !== '1' ||
                testInfo.project.name !== 'desktop',
            'Requires a signing key, native clients and independent runner; run once on desktop.',
        );
        await login(page, e2eAccounts.owner);
        await confirmPassword(page);
        await page.goto(base);
        const previous = await page
            .locator('[data-backup-id]')
            .evaluateAll((elements) =>
                elements.map((element) =>
                    element.getAttribute('data-backup-id'),
                ),
            );
        let id: string | null = null;
        let uploadedId: string | null = null;

        try {
            await page
                .getByRole('link', { name: 'Create backup', exact: true })
                .click();
            await page.getByRole('radio', { name: /^Selected tables/ }).click();
            await page
                .getByRole('checkbox', { name: 'countries', exact: true })
                .check();
            await expect(
                page.getByText(/Automatically included \([1-9]/),
            ).toBeVisible();
            await page
                .locator('#create-backup-note')
                .fill('Browser related-table backup');
            await page
                .getByRole('button', { name: 'Create backup', exact: true })
                .click();
            await expect(page).toHaveURL(new RegExp(`${base}$`));
            await expect
                .poll(
                    async () => {
                        const ids = await page
                            .locator('[data-backup-id]')
                            .evaluateAll((elements) =>
                                elements.map((element) =>
                                    element.getAttribute('data-backup-id'),
                                ),
                            );
                        id =
                            ids.find(
                                (value) =>
                                    value !== null && !previous.includes(value),
                            ) ?? null;

                        return id;
                    },
                    { timeout: 90_000 },
                )
                .toBeTruthy();
            await page.goto(`${base}/${id}`);
            await expect(
                page.getByRole('heading', { name: 'Recorded table selection' }),
            ).toBeVisible();
            await expect(
                page
                    .getByText('Browser related-table backup', { exact: true })
                    .first(),
            ).toBeVisible();
            await checkAppearances(page, testInfo, 'detail');
            const download = page.waitForEvent('download');
            await page
                .getByRole('link', { name: 'Download', exact: true })
                .click();
            const downloaded = await download;
            expect(downloaded.suggestedFilename()).toMatch(/\.fieldops$/);
            const sourcePath = testInfo.outputPath('signed-source.fieldops');
            await downloaded.saveAs(sourcePath);
            await page
                .getByRole('button', { name: 'Restore', exact: true })
                .click();
            const dialog = page.getByRole('dialog', {
                name: 'Restore selected tables?',
            });
            await expect(
                dialog.getByRole('region', { name: 'Restore table selection' }),
            ).toContainText('countries');
            await expect(
                dialog.getByText(/Everyone must sign in again/),
            ).toBeVisible();
            await expect(
                dialog.getByRole('button', { name: 'Replace selected tables' }),
            ).toBeDisabled();
            await dialog
                .getByLabel(/Type the database name/)
                .fill('incorrect-database-name');
            await expect(
                dialog.getByRole('button', { name: 'Replace selected tables' }),
            ).toBeDisabled();
            await dialog
                .getByRole('button', { name: 'Cancel', exact: true })
                .click();

            await page.goto(`${base}/create`);
            await page.getByLabel('Backup package').setInputFiles(sourcePath);
            await page
                .locator('#upload-backup-note')
                .fill('Browser uploaded copy');
            await page
                .getByRole('button', { name: 'Upload package', exact: true })
                .click();
            await expect(page).toHaveURL(new RegExp(`${base}$`));
            await expect
                .poll(async () => {
                    const ids = await page
                        .locator('[data-backup-id]')
                        .evaluateAll((elements) =>
                            elements.map((element) =>
                                element.getAttribute('data-backup-id'),
                            ),
                        );
                    uploadedId =
                        ids.find(
                            (value) =>
                                value !== null &&
                                value !== id &&
                                !previous.includes(value),
                        ) ?? null;

                    return uploadedId;
                })
                .toBeTruthy();
            await page.goto(`${base}/${uploadedId}`);
            await expect(
                page.getByText('Uploaded by', { exact: true }),
            ).toBeVisible();
            await expect(
                page
                    .getByText('Browser related-table backup', { exact: true })
                    .first(),
            ).toBeVisible();
            const uploadedDownload = page.waitForEvent('download');
            await page
                .getByRole('link', { name: 'Download', exact: true })
                .click();
            const uploadedPath = testInfo.outputPath(
                'signed-reuploaded.fieldops',
            );
            await (await uploadedDownload).saveAs(uploadedPath);
            expect(await readFile(uploadedPath)).toEqual(
                await readFile(sourcePath),
            );
        } finally {
            for (const cleanupId of [uploadedId, id]) {
                if (!cleanupId) {
                    continue;
                }

                await page.goto(`${base}/${cleanupId}`);

                if (
                    (await page
                        .getByRole('button', { name: 'Delete', exact: true })
                        .count()) === 0
                ) {
                    continue;
                }

                await page
                    .getByRole('button', { name: 'Delete', exact: true })
                    .click();
                await page
                    .getByRole('dialog')
                    .getByRole('button', { name: 'Delete backup', exact: true })
                    .click();
                await expect(page).toHaveURL(new RegExp(`${base}$`));
                await expect(
                    page.locator(`[data-backup-id="${cleanupId}"]`),
                ).toHaveCount(0);
                await page.goto(`${base}/audit?backup=${cleanupId}`);
                await expect(
                    page.getByText('backup deleted', { exact: true }),
                ).toBeVisible();
                await expect(
                    page
                        .getByText('Original package provenance', {
                            exact: true,
                        })
                        .first(),
                ).toBeVisible();
            }
        }
    });
});
