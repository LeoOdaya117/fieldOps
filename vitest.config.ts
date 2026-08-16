import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/Frontend/setup.ts'],
        include: ['tests/Frontend/**/*.test.{ts,tsx}'],
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['resources/js/**/*.{ts,tsx}'],
            exclude: [
                'resources/js/actions/**',
                'resources/js/routes/**',
                'resources/js/types/**',
                'resources/js/wayfinder/**',
                '**/*.d.ts',
            ],
        },
    },
});
