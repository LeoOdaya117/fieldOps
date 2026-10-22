import { Link, usePage } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
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
import { getNavigationGroups, getNavigationItemByKey } from '@/lib/navigation';

export function AppSidebar() {
    const { auth } = usePage().props;
    const groups = getNavigationGroups(auth);
    const dashboard = getNavigationItemByKey(groups, 'dashboard');

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            {dashboard ? (
                                <Link href={dashboard.href} prefetch>
                                    <AppLogo />
                                </Link>
                            ) : (
                                <div>
                                    <AppLogo />
                                </div>
                            )}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {groups.map((group, index) => (
                    <NavMain
                        key={`${group.label}-${index}`}
                        items={group.items}
                        label={group.label}
                    />
                ))}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
