import type { Page } from '@playwright/test';

export type E2EAccount = {
    label: string;
    email: string;
    password: string;
};

export const e2eAccounts = {
    user: {
        label: 'E2E user',
        email: process.env.E2E_USER_EMAIL ?? 'user@example.com',
        password: process.env.E2E_USER_PASSWORD ?? 'password',
    },
    admin: {
        label: 'E2E administrator',
        email: process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com',
        password: process.env.E2E_ADMIN_PASSWORD ?? 'password',
    },
    owner: {
        label: 'E2E owner',
        email: process.env.E2E_OWNER_EMAIL ?? 'superadmin@example.com',
        password: process.env.E2E_OWNER_PASSWORD ?? 'password',
    },
} satisfies Record<string, E2EAccount>;

export async function login(page: Page, account: E2EAccount): Promise<void> {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(account.email);
    await page
        .getByRole('textbox', { name: 'Password' })
        .fill(account.password);

    const loginResponse = page.waitForResponse(
        (response) =>
            response.request().method() === 'POST' &&
            new URL(response.url()).pathname === '/login',
    );

    await page.getByRole('button', { name: 'Log in' }).click();

    const response = await loginResponse;

    if (response.status() === 429) {
        throw new Error(
            `${account.label} login is rate-limited (HTTP 429). Check the E2E credentials and wait for the configured login-attempt window to expire before retrying.`,
        );
    }

    const lockoutOrCredentialError = page
        .getByRole('alert')
        .filter({
            hasText:
                /these credentials do not match our records|too many login attempts/i,
        })
        .first();

    let result: 'dashboard' | 'login-error';

    try {
        result = await Promise.race([
            page
                .waitForURL(/\/dashboard$/, { timeout: 10_000 })
                .then(() => 'dashboard' as const),
            lockoutOrCredentialError
                .waitFor({ state: 'visible', timeout: 10_000 })
                .then(() => 'login-error' as const),
        ]);
    } catch {
        throw new Error(
            `${account.label} could not sign in. Verify the account exists, is active, and matches the configured E2E credentials.`,
        );
    }

    if (result === 'login-error') {
        const message = (await lockoutOrCredentialError.textContent())?.trim();

        if (message && /too many login attempts/i.test(message)) {
            throw new Error(
                `${account.label} login is rate-limited. Check the E2E credentials and wait for the configured login-attempt window to expire before retrying.`,
            );
        }

        throw new Error(
            `${account.label} could not sign in. Verify the account exists, is active, and matches the configured E2E credentials. ${message ?? ''}`.trim(),
        );
    }
}
