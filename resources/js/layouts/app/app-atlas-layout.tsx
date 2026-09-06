import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { getNavigationGroups } from '@/lib/navigation';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { PlatformLogo } from '@/components/platform-logo';
import {
    MobilePlatformNavigation,
    PlatformBreadcrumbs,
    PlatformUserButton,
    ShellMain,
} from '@/components/platform-shell-parts';
import type { AppLayoutProps } from '@/types';

export default function AppAtlasLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { auth } = usePage().props;
    const groups = getNavigationGroups(auth);
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="min-h-screen bg-background">
            <header className="platform-masthead flex h-14 items-center border-b border-border bg-foreground px-4 text-background sm:px-6">
                <MobilePlatformNavigation
                    groups={groups}
                    className="mr-2 text-background hover:bg-background/10 hover:text-background"
                />
                <Link href="/dashboard" className="flex items-center">
                    <PlatformLogo
                        variant="wordmark-on-dark"
                        className="h-7 max-w-40"
                    />
                </Link>
                <span className="ml-4 hidden border-l border-background/20 pl-4 text-xs font-medium text-background/70 sm:block">
                    Operations workspace
                </span>
                <PlatformUserButton className="ml-auto text-background hover:bg-background/10 hover:text-background" />
            </header>
            <div className="flex min-h-[calc(100vh-3.5rem)]">
                <aside className="hidden w-60 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
                    <nav
                        className="flex-1 space-y-6 overflow-y-auto px-4 py-6"
                        aria-label="Main navigation"
                    >
                        {groups.map((group) => (
                            <div key={group.label}>
                                <p className="px-3 pb-2 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                                    {group.label}
                                </p>
                                <div className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const active = isCurrentOrParentUrl(
                                            item.href,
                                        );
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                aria-current={
                                                    active ? 'page' : undefined
                                                }
                                                className={cn(
                                                    'flex min-h-10 items-center gap-3 rounded-sm px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent',
                                                    active &&
                                                        'bg-sidebar-accent text-sidebar-accent-foreground',
                                                )}
                                            >
                                                {Icon && (
                                                    <Icon className="size-4" />
                                                )}
                                                {item.title}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex min-h-12 items-center border-b border-border bg-card px-4 sm:px-6">
                        <PlatformBreadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                    <ShellMain>{children}</ShellMain>
                </div>
            </div>
        </div>
    );
}
