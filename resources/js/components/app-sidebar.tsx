import { Link } from '@inertiajs/react';
import {
    Clock3,
    Globe2,
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
import { index as countriesIndex } from '@/routes/system/countries';
import { index as timezonesIndex } from '@/routes/system/timezones';
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
    const systemItems: NavItem[] = [];
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

    if (can('ip_blocks.view')) {
        accessItems.push({
            title: 'Blocked IPs',
            href: '/access/ip-blocks',
            icon: ShieldCheck,
        });
    }

    if (can('visit_logs.view')) {
        accessItems.push({
            title: 'Visit logs',
            href: '/access/visit-logs',
            icon: ScrollText,
        });
    }

    if (can('countries.view')) {
        systemItems.push({
            title: 'Countries',
            href: countriesIndex(),
            icon: Globe2,
        });
    }

    if (can('timezones.view')) {
        systemItems.push({
            title: 'Timezones',
            href: timezonesIndex(),
            icon: Clock3,
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
                {systemItems.length > 0 && (
                    <NavMain items={systemItems} label="System" />
                )}
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
