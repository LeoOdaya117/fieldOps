import { Link, router, usePage } from '@inertiajs/react';
import { Image, LayoutTemplate, Map, MapPin, Settings2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const sections = [
    { title: 'General', href: '/settings/system', icon: Settings2 },
    {
        title: 'Layout themes',
        href: '/settings/system/layout',
        icon: LayoutTemplate,
    },
    { title: 'Address', href: '/settings/system/address', icon: MapPin },
    { title: 'Map', href: '/settings/system/map', icon: Map },
    {
        title: 'Platform images',
        href: '/settings/system/platform-images',
        icon: Image,
    },
];

export default function SystemSettingsLayout({ children }: PropsWithChildren) {
    const { url } = usePage();
    const currentPath = url.split('?')[0];
    const currentSection =
        sections.find((section) => section.href === currentPath) ?? sections[0];

    return (
        <div className="platform-content mx-auto w-full px-4 py-7 sm:px-6 sm:py-9">
            <div className="mb-7 max-w-2xl">
                <h1 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">
                    System settings
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Manage identity, layout, security, and location defaults.
                </p>
            </div>
            <div className="mb-6 lg:hidden">
                <label
                    id="system-settings-section-label"
                    className="mb-2 block text-sm font-medium"
                >
                    Settings section
                </label>
                <Select
                    value={currentSection.href}
                    onValueChange={(value) => router.visit(value)}
                >
                    <SelectTrigger
                        className="min-h-11 w-full bg-background"
                        aria-labelledby="system-settings-section-label"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                        {sections.map((section) => (
                            <SelectItem key={section.href} value={section.href}>
                                <section.icon className="size-4" />
                                {section.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid items-start gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
                <aside className="sticky top-6 hidden lg:block">
                    <nav
                        aria-label="System settings navigation"
                        className="space-y-1"
                    >
                        {sections.map((section) => {
                            const active = currentPath === section.href;

                            return (
                                <Link
                                    key={section.href}
                                    href={section.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground motion-reduce:transition-none',
                                        active &&
                                            'bg-accent text-accent-foreground',
                                    )}
                                >
                                    <section.icon className="size-4" />
                                    {section.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>
                <section
                    className="min-w-0"
                    aria-label={`${currentSection.title} settings`}
                >
                    {children}
                </section>
            </div>
        </div>
    );
}
