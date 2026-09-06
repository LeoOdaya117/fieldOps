import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { getNavigationGroups } from '@/lib/navigation';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { PlatformLogo } from '@/components/platform-logo';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    MobilePlatformNavigation,
    PlatformBreadcrumbs,
    PlatformUserButton,
    ShellMain,
} from '@/components/platform-shell-parts';
import type { AppLayoutProps } from '@/types';

export default function AppRailLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { auth } = usePage().props;
    const groups = getNavigationGroups(auth);
    const items = groups.flatMap((group) => group.items);
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="hidden w-[4.5rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
                <Link
                    href="/dashboard"
                    className="flex h-16 items-center justify-center border-b border-sidebar-border"
                >
                    <PlatformLogo variant="mark" className="size-8" />
                </Link>
                <nav
                    className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-4"
                    aria-label="Main navigation"
                >
                    {items.map((item) => {
                        const active = isCurrentOrParentUrl(item.href);
                        const Icon = item.icon;

                        return (
                            <Tooltip key={item.title}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        aria-label={item.title}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        className={cn(
                                            'flex size-11 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent',
                                            active &&
                                                'bg-sidebar-primary text-sidebar-primary-foreground',
                                        )}
                                    >
                                        {Icon && (
                                            <Icon className="size-[1.125rem]" />
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {item.title}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 items-center border-b border-border bg-card px-4 sm:px-6">
                    <MobilePlatformNavigation
                        groups={groups}
                        className="mr-2"
                    />
                    <PlatformLogo
                        variant="wordmark"
                        className="h-7 max-w-36 lg:hidden"
                    />
                    <PlatformBreadcrumbs
                        breadcrumbs={breadcrumbs}
                        className="hidden lg:block"
                    />
                    <PlatformUserButton className="ml-auto" />
                </header>
                <ShellMain>{children}</ShellMain>
            </div>
        </div>
    );
}
