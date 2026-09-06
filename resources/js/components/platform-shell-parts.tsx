import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Menu } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PlatformLogo } from '@/components/platform-logo';
import { UserMenuContent } from '@/components/user-menu-content';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import type { NavigationGroup } from '@/lib/navigation';
import type { BreadcrumbItem } from '@/types';

export function PlatformUserButton({ className }: { className?: string }) {
    const { auth } = usePage().props;
    const getInitials = useInitials();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn('size-10 rounded-full p-1', className)}
                    aria-label="Open user menu"
                >
                    <Avatar className="size-8 overflow-hidden rounded-full">
                        <AvatarImage
                            src={auth.user?.avatar}
                            alt={auth.user?.name}
                        />
                        <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                            {getInitials(auth.user?.name ?? '')}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="end">
                {auth.user && <UserMenuContent user={auth.user} />}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function MobilePlatformNavigation({
    groups,
    className,
}: {
    groups: NavigationGroup[];
    className?: string;
}) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn('lg:hidden', className)}
                    aria-label="Open navigation"
                >
                    <Menu className="size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="flex w-80 max-w-[88vw] flex-col bg-sidebar p-0"
            >
                <SheetHeader className="border-b border-sidebar-border px-5 py-5 text-left">
                    <SheetTitle>
                        <PlatformLogo
                            variant="wordmark"
                            className="h-8 max-w-44"
                        />
                    </SheetTitle>
                </SheetHeader>
                <nav
                    className="flex-1 space-y-6 overflow-y-auto px-4 py-5"
                    aria-label="Mobile navigation"
                >
                    {groups.map((group) => (
                        <div key={group.label}>
                            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground">
                                {group.label}
                            </p>
                            <div className="space-y-1">
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
                                                'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent motion-reduce:transition-none',
                                                active &&
                                                    'bg-sidebar-accent text-sidebar-accent-foreground',
                                            )}
                                        >
                                            {Icon && (
                                                <Icon className="size-4" />
                                            )}
                                            <span>{item.title}</span>
                                            {active && (
                                                <ChevronRight className="ml-auto size-4" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </SheetContent>
        </Sheet>
    );
}

export function PlatformBreadcrumbs({
    breadcrumbs = [],
    className,
}: {
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}) {
    return (
        <div className={cn('min-w-0 text-muted-foreground', className)}>
            <Breadcrumbs breadcrumbs={breadcrumbs} />
        </div>
    );
}

export function ShellMain({
    children,
    className,
    ...props
}: ComponentProps<'main'>) {
    return (
        <main
            className={cn(
                'platform-content mx-auto flex min-h-0 w-full flex-1 flex-col',
                className,
            )}
            {...props}
        >
            {children}
        </main>
    );
}
