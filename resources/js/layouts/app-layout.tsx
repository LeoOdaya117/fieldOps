import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { FlashAlert } from '@/components/flash-alert';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            <FlashAlert />
            {children}
        </AppLayoutTemplate>
    );
}
