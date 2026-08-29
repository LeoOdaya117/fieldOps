import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { Image, Map, MapPin, Settings2 } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editSystemSettings } from '@/routes/system-settings';
import type { NavItem } from '@/types';

type SystemSettingsNavItem = NavItem & {
    disabled?: boolean;
};

const systemSettingsNavItems: SystemSettingsNavItem[] = [
    {
        title: 'System',
        href: editSystemSettings(),
        icon: Settings2,
    },
    {
        title: 'Address',
        href: '#address',
        icon: MapPin,
        disabled: true,
    },
    {
        title: 'Map',
        href: '#map',
        icon: Map,
        disabled: true,
    },
    {
        title: 'Platform images',
        href: '#platform-images',
        icon: Image,
        disabled: true,
    },
];

export default function SystemSettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="px-4 py-6">
            <Heading
                title="System settings"
                description="Manage organization-wide configuration for FieldOps"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav
                        className="space-y-1"
                        aria-label="System settings navigation"
                    >
                        <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            System settings
                        </p>
                        {systemSettingsNavItems.map((item) =>
                            item.disabled ? (
                                <Button
                                    key={item.title}
                                    size="sm"
                                    variant="ghost"
                                    disabled
                                    className="w-full justify-start"
                                    title={`${item.title} settings coming soon`}
                                >
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Button>
                            ) : (
                                <Button
                                    key={`${toUrl(item.href)}`}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn('w-full justify-start', {
                                        'bg-muted': isCurrentOrParentUrl(
                                            item.href,
                                        ),
                                    })}
                                >
                                    <Link href={item.href}>
                                        {item.icon && (
                                            <item.icon className="h-4 w-4" />
                                        )}
                                        {item.title}
                                    </Link>
                                </Button>
                            ),
                        )}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="min-w-0 flex-1">
                    <section className="w-full space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
