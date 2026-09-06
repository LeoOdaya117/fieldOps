import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Menu } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { PlatformLogo } from '@/components/platform-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { getNavigationGroups } from '@/lib/navigation';
import type { BreadcrumbItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

export function AppHeader({ breadcrumbs = [] }: Props) {
    const { auth } = usePage().props;
    const groups = getNavigationGroups(auth);
    const getInitials = useInitials();
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <>
            <header className="border-b border-border bg-background/95">
                <div className="platform-content mx-auto flex h-15 items-center gap-4 px-4 sm:px-6">
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Open navigation"
                                >
                                    <Menu className="size-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="flex w-72 flex-col bg-sidebar p-0"
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
                                    aria-label="Main navigation"
                                >
                                    {groups.map((group) => (
                                        <div key={group.label}>
                                            <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
                                                {group.label}
                                            </p>
                                            <div className="space-y-1">
                                                {group.items.map((item) => (
                                                    <Link
                                                        key={item.title}
                                                        href={item.href}
                                                        className={cn(
                                                            'flex min-h-10 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent',
                                                            isCurrentOrParentUrl(
                                                                item.href,
                                                            ) &&
                                                                'bg-sidebar-accent text-sidebar-accent-foreground',
                                                        )}
                                                    >
                                                        {item.icon && (
                                                            <item.icon className="size-4" />
                                                        )}
                                                        {item.title}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href="/dashboard"
                        prefetch
                        className="flex min-w-0 items-center"
                    >
                        <AppLogo />
                    </Link>

                    <nav
                        className="ml-3 hidden items-center gap-1 lg:flex"
                        aria-label="Main navigation"
                    >
                        {groups.map((group) => {
                            const onlyItem =
                                group.items.length === 1
                                    ? group.items[0]
                                    : null;

                            if (onlyItem) {
                                const Icon = onlyItem.icon;

                                return (
                                    <Button
                                        key={group.label}
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className={cn(
                                            isCurrentOrParentUrl(
                                                onlyItem.href,
                                            ) &&
                                                'bg-accent text-accent-foreground',
                                        )}
                                    >
                                        <Link href={onlyItem.href}>
                                            {Icon && (
                                                <Icon className="size-4" />
                                            )}
                                            {onlyItem.title}
                                        </Link>
                                    </Button>
                                );
                            }

                            return (
                                <DropdownMenu key={group.label}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                group.items.some((item) =>
                                                    isCurrentOrParentUrl(
                                                        item.href,
                                                    ),
                                                ) &&
                                                    'bg-accent text-accent-foreground',
                                            )}
                                        >
                                            {group.label}
                                            <ChevronDown className="size-3.5 opacity-60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        className="w-56"
                                    >
                                        <DropdownMenuLabel>
                                            {group.label}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {group.items.map((item) => (
                                            <DropdownMenuItem
                                                key={item.title}
                                                asChild
                                            >
                                                <Link
                                                    href={item.href}
                                                    className="gap-2.5"
                                                >
                                                    {item.icon && (
                                                        <item.icon className="size-4" />
                                                    )}
                                                    {item.title}
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            );
                        })}
                    </nav>

                    <div className="ml-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-10 rounded-full p-1"
                                    aria-label="Open user menu"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user?.avatar}
                                            alt={auth.user?.name}
                                        />
                                        <AvatarFallback className="bg-muted text-muted-foreground">
                                            {getInitials(auth.user?.name ?? '')}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                {auth.user && (
                                    <UserMenuContent user={auth.user} />
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {breadcrumbs.length > 1 && (
                <div className="border-b border-border bg-background">
                    <div className="platform-content mx-auto flex h-11 items-center px-4 text-muted-foreground sm:px-6">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
