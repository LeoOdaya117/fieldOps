import { NavigationLink } from '@/components/navigation-link';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({
    items = [],
    label = 'Platform',
}: {
    items: NavItem[];
    label?: string;
}) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.key ?? item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={!item.external && isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                        >
                            <NavigationLink href={String(item.href)} prefetch>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </NavigationLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
