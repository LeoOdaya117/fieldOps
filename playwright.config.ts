import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 120_000,
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 1,
    workers: process.env.CI ? 2 : 1,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://fieldops.test',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'mobile',
            use: {
                browserName: 'chromium',
                viewport: { width: 390, height: 844 },
                isMobile: true,
                hasTouch: true,
            },
        },
        {
            name: 'tablet',
            use: {
                browserName: 'chromium',
                viewport: { width: 768, height: 1024 },
                isMobile: true,
                hasTouch: true,
            },
        },
        {
            name: 'desktop',
            use: {
                browserName: 'chromium',
                viewport: { width: 1440, height: 900 },
            },
        },
    ],
});
