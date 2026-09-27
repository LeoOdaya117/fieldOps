import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import SystemSettingsLayout from '@/layouts/settings/system-layout';
import {
    PageLoadingBoundary,
    PageLoadingProvider,
} from '@/features/page-loading/page-loading-provider';

const appName = document.documentElement.dataset.platformName || 'FieldOps';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return PageLoadingBoundary;
            case name.startsWith('auth/'):
                return [AuthLayout, PageLoadingBoundary];
            case name === 'settings/system' ||
                name.startsWith('settings/system/'):
                return [AppLayout, SystemSettingsLayout, PageLoadingBoundary];
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout, PageLoadingBoundary];
            default:
                return [AppLayout, PageLoadingBoundary];
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                <PageLoadingProvider>
                    {app}
                    <Toaster />
                </PageLoadingProvider>
            </TooltipProvider>
        );
    },
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();
