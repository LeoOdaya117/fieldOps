import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('notifications work in every shell, appearance, and viewport', async ({
    page,
}, testInfo) => {
    test.setTimeout(300_000);
    const password = process.env.E2E_OWNER_PASSWORD ?? 'password';
    await page.goto('/login');
    await page
        .getByLabel('Email address')
        .fill(process.env.E2E_OWNER_EMAIL ?? 'superadmin@example.com');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/user/confirm-password');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Confirm password' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/settings/system/layout');
    const original = await page
        .getByRole('radio', { checked: true })
        .inputValue();

    try {
        for (const theme of [
            'Canvas',
            'Atlas',
            'Rail',
            'Navigator',
            'Horizon',
        ]) {
            await page.goto('/settings/system/layout');
            await page.getByRole('heading', { name: theme, level: 3 }).click();

            if (
                await page
                    .getByRole('button', { name: 'Apply layout' })
                    .isEnabled()
            ) {
                await page
                    .getByRole('button', { name: 'Apply layout' })
                    .click();
            }

            await expect(page.locator('html')).toHaveAttribute(
                'data-platform-theme',
                theme.toLowerCase(),
            );

            for (const appearance of ['light', 'dark'] as const) {
                await page.emulateMedia({
                    colorScheme: appearance,
                    reducedMotion: 'reduce',
                });
                await page.goto('/notifications');
                const bell = page.getByRole('button', {
                    name: /^Notifications, \d+ unread$/,
                });
                await expect(bell).toHaveCount(1);
                await expect(
                    page.getByRole('heading', {
                        name: 'Notifications',
                        exact: true,
                    }),
                ).toBeVisible();
                await bell.click();
                await expect(page.getByRole('dialog')).toBeVisible();
                await expect(
                    page.getByRole('link', { name: 'View all notifications' }),
                ).toBeVisible();
                const previewRows = page
                    .getByRole('dialog')
                    .getByRole('list', { name: 'Notification list' })
                    .getByRole('listitem');

                if (await previewRows.count()) {
                    await expect(
                        page
                            .getByRole('dialog')
                            .getByText('Unread', { exact: true })
                            .first(),
                    ).toBeVisible();
                } else {
                    await expect(
                        page
                            .getByRole('dialog')
                            .getByText('No notifications here'),
                    ).toBeVisible();
                }

                expect(
                    (
                        await new AxeBuilder({ page })
                            .include('[role=dialog]')
                            .analyze()
                    ).violations,
                ).toEqual([]);

                if (theme === 'Canvas') {
                    await page.screenshot({
                        path: testInfo.outputPath(`preview-${appearance}.png`),
                    });
                }

                await page.keyboard.press('Escape');
                await expect(bell).toBeFocused();
                await page
                    .getByRole('link', { name: 'Unread', exact: true })
                    .click();
                await expect(page).toHaveURL(/filter=unread/);
                const unreadBefore = Number(
                    (await bell.getAttribute('aria-label'))?.match(/\d+/)?.[0],
                );
                const unreadRows = page
                    .getByRole('list', { name: 'Notification list' })
                    .getByRole('listitem');

                if (await unreadRows.count()) {
                    await unreadRows
                        .first()
                        .getByRole('button', {
                            name: 'Mark as read',
                            exact: true,
                        })
                        .click();
                    await expect(bell).toHaveAttribute(
                        'aria-label',
                        `Notifications, ${unreadBefore - 1} unread`,
                    );
                    await page
                        .getByRole('link', { name: 'Read', exact: true })
                        .click();
                    await expect(page).toHaveURL(/filter=read/);
                    await page
                        .getByRole('list', { name: 'Notification list' })
                        .getByRole('listitem')
                        .first()
                        .getByRole('button', {
                            name: 'Mark as unread',
                            exact: true,
                        })
                        .click();
                    await expect(bell).toHaveAttribute(
                        'aria-label',
                        `Notifications, ${unreadBefore} unread`,
                    );
                } else {
                    await expect(
                        page.getByText('No notifications here'),
                    ).toBeVisible();
                }

                await page
                    .getByRole('link', { name: 'All', exact: true })
                    .click();
                await expect(page).toHaveURL(/filter=all/);
                await expect(
                    page.getByRole('link', { name: 'All', exact: true }),
                ).toHaveAttribute('aria-current', 'page');
                expect(
                    await page.evaluate(
                        () =>
                            document.documentElement.scrollWidth <=
                            window.innerWidth,
                    ),
                ).toBe(true);
                expect(
                    (await new AxeBuilder({ page }).include('main').analyze())
                        .violations,
                ).toEqual([]);
                await page.screenshot({
                    path: testInfo.outputPath(
                        `notifications-${theme}-${appearance}.png`,
                    ),
                    fullPage: false,
                });
                const mobileNavigation = page.getByRole('button', {
                    name: 'Open navigation',
                });
                const canvasNavigation = page.getByRole('button', {
                    name: 'Toggle Sidebar',
                });

                if (await mobileNavigation.isVisible()) {
                    await mobileNavigation.click();
                } else if (
                    (await canvasNavigation.isVisible()) &&
                    testInfo.project.name === 'mobile'
                ) {
                    await canvasNavigation.click();
                }

                if (
                    theme === 'Horizon' &&
                    testInfo.project.name === 'desktop'
                ) {
                    await page
                        .getByRole('button', { name: 'Platform', exact: true })
                        .click();
                    await expect(
                        page.getByRole('menuitem', {
                            name: 'Notifications',
                            exact: true,
                        }),
                    ).toBeVisible();
                } else {
                    await expect(
                        page
                            .getByRole('link', {
                                name: 'Notifications',
                                exact: true,
                            })
                            .first(),
                    ).toBeVisible();
                }

                await page.keyboard.press('Escape');
            }
        }
    } finally {
        await page.goto('/settings/system/layout');
        await page
            .getByRole('heading', {
                name: new RegExp(`^${original}$`, 'i'),
                level: 3,
            })
            .click();

        if (
            await page.getByRole('button', { name: 'Apply layout' }).isEnabled()
        ) {
            await page.getByRole('button', { name: 'Apply layout' }).click();
        }
    }
});
