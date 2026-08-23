import { Link } from '@inertiajs/react';
import {
    BookOpen,
    FolderGit2,
    LayoutGrid,
    ScrollText,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const permissions = auth.authorization?.permissions ?? [];
    const can = (permission: string) =>
        auth.authorization?.isOwner || permissions.includes(permission);

    const accessItems: NavItem[] = [];

    if (can('users.view')) {
        accessItems.push({
            title: 'Users',
            href: '/access/users',
            icon: Users,
        });
    }

    if (can('roles.view')) {
        accessItems.push({
            title: 'Roles',
            href: '/access/roles',
            icon: ShieldCheck,
        });
    }

    if (can('audit.view')) {
        accessItems.push({
            title: 'Access audit',
            href: '/access/audit',
            icon: ScrollText,
        });
    }

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                {accessItems.length > 0 && <NavMain items={accessItems} />}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
