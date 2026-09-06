import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const owner = {
    email: process.env.E2E_OWNER_EMAIL ?? 'superadmin@example.com',
    password: process.env.E2E_OWNER_PASSWORD ?? 'password',
};

async function loginAsOwner(page: Page) {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(owner.email);
    await page.getByRole('textbox', { name: 'Password' }).fill(owner.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}

async function confirmOwnerPassword(page: Page) {
    await page.goto('/user/confirm-password');
    await page.getByRole('textbox', { name: 'Password' }).fill(owner.password);
    await page.getByRole('button', { name: 'Confirm password' }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}

async function visitSection(page: Page, path: string, title: string) {
    const selector = page.getByLabel('Settings section');

    if (await selector.isVisible()) {
        await selector.click();
        await page.getByRole('option', { name: title, exact: true }).click();
    } else {
        await page.getByRole('link', { name: title, exact: true }).click();
    }

    await expect(page).toHaveURL(new RegExp(`${path.replaceAll('/', '\\/')}$`));
}

test('the settings starter kit is responsive, accessible, and complete', async ({
    page,
}, testInfo) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await loginAsOwner(page);
    await page.goto('/settings/system');

    await expect(
        page.getByRole('heading', { name: 'System settings' }),
    ).toBeVisible();
    await expect(page.getByLabel('Log out after inactivity')).toHaveValue(
        '900',
    );
    await expect(page.getByLabel('Failed attempts allowed')).toHaveValue('5');
    await expect(page.getByLabel('Reset attempts after')).toHaveValue('30');
    await expect(page.getByRole('radio')).toHaveCount(0);

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await visitSection(page, '/settings/system/layout', 'Layout themes');
    await expect(page.getByRole('radio')).toHaveCount(5);

    if (testInfo.project.name !== 'tablet') {
        await page.screenshot({
            path: path.resolve(
                '.impeccable/captures',
                `layout-themes-light-${testInfo.project.name}.png`,
            ),
            fullPage: true,
        });
        await page.emulateMedia({
            colorScheme: 'dark',
            reducedMotion: 'reduce',
        });
        await page.reload();
        await page.screenshot({
            path: path.resolve(
                '.impeccable/captures',
                `layout-themes-dark-${testInfo.project.name}.png`,
            ),
            fullPage: true,
        });
        await page.emulateMedia({
            colorScheme: 'light',
            reducedMotion: 'reduce',
        });
        await page.reload();
    }

    await visitSection(page, '/settings/system/address', 'Address');
    await expect(page.getByLabel('Region', { exact: true })).toBeVisible();
    await page.getByLabel('Region', { exact: true }).click();
    await expect(
        page.getByRole('option', { name: 'National Capital Region' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    await visitSection(page, '/settings/system/map', 'Map');
    const mapSetup = page.getByText('Mapbox is ready for a public token');
    if (await mapSetup.count()) {
        await expect(mapSetup).toBeVisible();
    } else {
        await expect(
            page.getByRole('region', {
                name: 'Map for selecting organization coordinates',
            }),
        ).toBeVisible();
    }
    await expect(page.getByLabel('Latitude')).toBeEditable();
    await expect(page.getByLabel('Longitude')).toBeEditable();

    await visitSection(
        page,
        '/settings/system/platform-images',
        'Platform images',
    );
    await expect(page.getByText('Owner controls enabled')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change' })).toHaveCount(5);
    await page.getByRole('button', { name: 'Change' }).first().click();
    const gallery = page.getByRole('dialog', {
        name: /choose compact brand mark/i,
    });
    await expect(gallery).toBeVisible();
    await expect(
        page.getByRole('tab', { name: 'Upload', exact: true }),
    ).toBeVisible();
    await expect(
        page.getByRole('tab', { name: 'Camera', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(gallery).toBeHidden();
});

test('an Owner can compare, apply, and persist all five application layouts', async ({
    page,
}, testInfo) => {
    test.skip(
        testInfo.project.name !== 'desktop',
        'Global layout mutation runs once on desktop.',
    );
    test.setTimeout(240_000);

    await loginAsOwner(page);
    await confirmOwnerPassword(page);

    await page.goto('/settings/system/layout');
    const themeNames = ['Canvas', 'Atlas', 'Rail', 'Navigator', 'Horizon'];
    const currentTheme = await page
        .getByRole('radio', { checked: true })
        .inputValue();
    const currentName =
        themeNames.find((theme) => theme.toLowerCase() === currentTheme) ??
        'Canvas';
    const sequence = [
        ...themeNames.filter((theme) => theme !== currentName),
        currentName,
        ...(currentName === 'Canvas' ? [] : ['Canvas']),
    ];

    for (const theme of sequence) {
        await page.goto('/settings/system/layout');
        await page.getByRole('heading', { name: theme, level: 3 }).click();
        await expect(
            page.getByRole('radio', { name: new RegExp(`^${theme}\\b`, 'i') }),
        ).toBeChecked();
        await page.getByRole('button', { name: 'Apply layout' }).click();
        await expect(page).toHaveURL(/\/settings\/system\/layout$/);
        await expect(page.locator('html')).toHaveAttribute(
            'data-platform-theme',
            theme.toLowerCase(),
        );
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute(
            'data-platform-theme',
            theme.toLowerCase(),
        );
        await expect(
            page.getByRole('radio', {
                name: new RegExp(`^${theme}\\b`, 'i'),
            }),
        ).toBeChecked();
    }
});
