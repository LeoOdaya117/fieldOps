import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';
import { e2eAccounts, login } from './support/auth';

export default async function globalSetup(config: FullConfig): Promise<void> {
    const baseURL = config.projects[0]?.use.baseURL;

    if (typeof baseURL !== 'string') {
        throw new Error('Playwright requires a string baseURL for E2E setup.');
    }

    const browser = await chromium.launch();

    try {
        for (const account of Object.values(e2eAccounts)) {
            const page = await browser.newPage({ baseURL });

            try {
                await login(page, account);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);

                throw new Error(
                    `Playwright stopped before running tests: ${message}`,
                    { cause: error },
                );
            } finally {
                await page.close();
            }
        }
    } finally {
        await browser.close();
    }
}
