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

export default function AppNavigatorLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { auth } = usePage().props;
    const groups = getNavigationGroups(auth);
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const activeGroup =
        groups.find((group) =>
            group.items.some((item) => isCurrentOrParentUrl(item.href)),
        ) ?? groups[0];

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="hidden w-16 shrink-0 flex-col bg-foreground text-background lg:flex">
                <Link
                    href="/dashboard"
                    className="flex h-16 items-center justify-center border-b border-background/15"
                >
                    <PlatformLogo variant="mark" className="size-8" />
                </Link>
                <nav
                    className="flex flex-1 flex-col items-center gap-2 py-4"
                    aria-label="Navigation groups"
                >
                    {groups.map((group) => {
                        const active = group === activeGroup;
                        const Icon = group.items[0]?.icon;

                        return (
                            <Tooltip key={group.label}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={group.items[0].href}
                                        aria-label={group.label}
                                        aria-current={
                                            active ? 'page' : undefined
                                        }
                                        className={cn(
                                            'flex size-10 items-center justify-center rounded-lg text-background/65 hover:bg-background/10 hover:text-background',
                                            active &&
                                                'bg-background text-foreground',
                                        )}
                                    >
                                        {Icon && (
                                            <Icon className="size-[1.125rem]" />
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {group.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>
                <PlatformUserButton className="mx-auto mb-4 text-background hover:bg-background/10 hover:text-background" />
            </aside>
            <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
                <div className="flex h-16 items-center border-b border-sidebar-border px-5">
                    <span className="text-sm font-semibold">
                        {activeGroup?.label}
                    </span>
                </div>
                <nav
                    className="space-y-1 p-4"
                    aria-label={`${activeGroup?.label ?? 'Current'} navigation`}
                >
                    {activeGroup?.items.map((item) => {
                        const active = isCurrentOrParentUrl(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent',
                                    active &&
                                        'bg-sidebar-accent text-sidebar-accent-foreground',
                                )}
                            >
                                {Icon && <Icon className="size-4" />}
                                {item.title}
                            </Link>
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
                    <PlatformUserButton className="ml-auto lg:hidden" />
                </header>
                <ShellMain>{children}</ShellMain>
            </div>
        </div>
    );
}
