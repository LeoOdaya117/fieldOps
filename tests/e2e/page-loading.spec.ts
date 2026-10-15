import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function expectResponsivePagePadding(page: Page, selector: string) {
    const viewportWidth = page.viewportSize()?.width ?? 0;
    const padding =
        viewportWidth >= 1024 ? '32px' : viewportWidth >= 640 ? '24px' : '16px';
    const expected = [padding, padding, padding, padding].join(' ');

    await expect
        .poll(() =>
            page.locator(selector).evaluate((element) => {
                const style = getComputedStyle(element);

                return [
                    style.paddingTop,
                    style.paddingRight,
                    style.paddingBottom,
                    style.paddingLeft,
                ].join(' ');
            }),
        )
        .toBe(expected);
}

test('the server boot skeleton stays visible until the landing page mounts', async ({
    page,
}) => {
    let releaseBootstrap!: () => void;
    const bootstrapRequest = new Promise<void>((resolve) => {
        releaseBootstrap = resolve;
    });

    await page.route('**/*', async (route) => {
        if (route.request().resourceType() === 'script') {
            await bootstrapRequest;
        }

        await route.continue();
    });

    const navigation = page.goto('/', { waitUntil: 'domcontentloaded' });
    const fallback = page.locator('#page-loading-fallback');

    try {
        await expect(fallback).toBeVisible();
        await expect(fallback).toHaveAttribute(
            'data-page-loading-family',
            'landing',
        );
        await expect(fallback).toHaveAttribute('aria-busy', 'true');
        await expectResponsivePagePadding(
            page,
            '#page-loading-fallback [data-page-loading-content]',
        );
    } finally {
        releaseBootstrap();
    }

    await navigation;
    await expect(
        page.getByRole('heading', {
            name: 'Keep every field job moving. From one clear view.',
        }),
    ).toBeVisible();
    await expect(fallback).toHaveCount(0);
});

test('slow page visits show the destination skeleton and clear it on render', async ({
    page,
}) => {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(
        page.getByRole('heading', {
            name: 'Keep every field job moving. From one clear view.',
        }),
    ).toBeVisible();

    await page.route('**/login', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.continue();
    });

    const mobileMenuButton = page.getByRole('button', { name: 'Open menu' });

    if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();
        await page
            .getByRole('navigation', { name: 'Mobile navigation' })
            .getByRole('link', { name: 'Login' })
            .click();
    } else {
        await page.getByRole('link', { name: 'Login' }).first().click();
    }

    const skeleton = page.locator(
        '[role="status"][data-page-loading-family="auth"]',
    );
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('aria-busy', 'true');
    await expectResponsivePagePadding(
        page,
        '[data-page-loading-family="auth"]',
    );
    await expect(page.locator('html')).toHaveClass(/dark/);

    const pulse = skeleton.locator('[data-slot="skeleton"]').first();
    await expect(pulse).toBeVisible();
    await expect
        .poll(() =>
            pulse.evaluate(
                (element) => getComputedStyle(element).animationName,
            ),
        )
        .toBe('none');

    expect(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);

    await expect(
        page.getByRole('heading', { name: 'Log in to your account' }),
    ).toBeVisible();
    await expect(skeleton).toHaveCount(0);
    await expect(page.locator('#page-loading-fallback')).toBeHidden();
});
