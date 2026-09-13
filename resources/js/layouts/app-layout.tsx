import { usePage } from '@inertiajs/react';
import { NotificationProvider } from '@/features/notifications/notification-provider';
import { FlashAlert } from '@/components/flash-alert';
import { PlatformRuntime } from '@/components/platform-runtime';
import type { BreadcrumbItem } from '@/types';
import { platformLayoutRegistry } from '@/lib/platform-themes';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { system } = usePage().props;
    const AppLayoutTemplate = platformLayoutRegistry[system.theme];

    return (
        <NotificationProvider>
            <PlatformRuntime />
            <AppLayoutTemplate breadcrumbs={breadcrumbs}>
                <FlashAlert />
                {children}
            </AppLayoutTemplate>
        </NotificationProvider>
    );
}
