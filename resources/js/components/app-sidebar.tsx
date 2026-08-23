import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    ScrollText,
    Settings2,
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
import { edit as editSystemSettings } from '@/routes/system-settings';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const permissions = auth.authorization?.permissions ?? [];
    const can = (permission: string) =>
        auth.authorization?.isOwner || permissions.includes(permission);

    const accessItems: NavItem[] = [];
    const footerItems: NavItem[] = [];

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

    if (can('settings.manage_system')) {
        footerItems.push({
            title: 'System settings',
            href: editSystemSettings(),
            icon: Settings2,
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
                {footerItems.length > 0 && (
                    <NavFooter items={footerItems} className="mt-auto" />
                )}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
