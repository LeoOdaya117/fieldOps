import { Link } from '@inertiajs/react';
import { ChevronDown, Globe2, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';
import { landingNavigation } from '../data';
import type { LandingNavItem } from '../types';

type LandingHeaderProps = {
    isAuthenticated: boolean;
};

function menuId(prefix: string, label: string) {
    return `${prefix}-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-menu`;
}

function hasChildren(item: LandingNavItem) {
    return Boolean(item.children?.length);
}

export function LandingHeader({ isAuthenticated }: LandingHeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [mobileOpenSection, setMobileOpenSection] = useState<string | null>(
        null,
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpenDropdown(null);
                setMobileOpenSection(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const closeMenus = () => {
        setMobileMenuOpen(false);
        setOpenDropdown(null);
        setMobileOpenSection(null);
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen((open) => !open);
        setOpenDropdown(null);
    };

    return (
        <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-reduce:animate-none">
            <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-5 px-5 sm:px-6 lg:px-8">
                <Link
                    href="/"
                    aria-label="FieldOps home"
                    className="flex shrink-0 items-center gap-2.5"
                    onClick={closeMenus}
                >
                    <span className="flex size-9 items-center justify-center text-brand">
                        <AppLogoIcon className="size-8" aria-hidden="true" />
                    </span>
                    <span className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                        FIELDOPS
                    </span>
                </Link>

                <nav
                    aria-label="Main navigation"
                    className="hidden items-center gap-4 lg:flex"
                >
                    {landingNavigation.map((item) => {
                        const itemHasChildren = hasChildren(item);
                        const isOpen = openDropdown === item.label;
                        const dropdownId = menuId('desktop', item.label);

                        return (
                            <div
                                key={item.label}
                                className="relative"
                                onMouseEnter={() =>
                                    itemHasChildren &&
                                    setOpenDropdown(item.label)
                                }
                                onMouseLeave={() =>
                                    setOpenDropdown((current) =>
                                        current === item.label ? null : current,
                                    )
                                }
                            >
                                <div className="flex items-center gap-0.5">
                                    <Link
                                        href={item.href}
                                        className="inline-flex min-h-10 items-center gap-1 rounded-md px-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:text-brand focus-visible:text-brand motion-reduce:transition-none"
                                        onClick={closeMenus}
                                    >
                                        {item.label}
                                    </Link>
                                    {itemHasChildren && (
                                        <button
                                            type="button"
                                            aria-label={`${isOpen ? 'Close' : 'Open'} ${item.label} menu`}
                                            aria-expanded={isOpen}
                                            aria-controls={dropdownId}
                                            className="inline-flex size-7 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-brand focus-visible:text-brand motion-reduce:transition-none"
                                            onClick={() =>
                                                setOpenDropdown(
                                                    isOpen ? null : item.label,
                                                )
                                            }
                                        >
                                            <ChevronDown
                                                className={cn(
                                                    'size-3.5 transition-transform duration-200 motion-reduce:transition-none',
                                                    isOpen && 'rotate-180',
                                                )}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    )}
                                </div>

                                {itemHasChildren && (
                                    <div
                                        id={dropdownId}
                                        role="menu"
                                        aria-hidden={!isOpen}
                                        inert={!isOpen}
                                        className={cn(
                                            'absolute top-full left-1/2 z-50 mt-2 w-80 -translate-x-1/2 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg transition-[opacity,transform,visibility] duration-200 motion-reduce:transition-none',
                                            isOpen
                                                ? 'visible translate-y-0 opacity-100'
                                                : 'pointer-events-none invisible -translate-y-2 opacity-0',
                                        )}
                                    >
                                        {item.children?.map((child) => {
                                            const ChildIcon = child.icon;

                                            return (
                                                <Link
                                                    key={child.label}
                                                    href={child.href}
                                                    role="menuitem"
                                                    className="group flex gap-3 rounded-lg p-3 transition-colors hover:bg-accent focus-visible:bg-accent motion-reduce:transition-none"
                                                    onClick={closeMenus}
                                                >
                                                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                                                        <ChildIcon
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                    </span>
                                                    <span>
                                                        <span className="block text-sm font-bold group-hover:text-brand">
                                                            {child.label}
                                                        </span>
                                                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                                            {child.description}
                                                        </span>
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                        <Link
                                            href={item.href}
                                            role="menuitem"
                                            className="mt-1 flex items-center justify-between rounded-lg border-t border-border px-3 py-3 text-xs font-bold text-brand hover:bg-accent"
                                            onClick={closeMenus}
                                        >
                                            View all {item.label}
                                            <span aria-hidden="true">→</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                    <span className="inline-flex items-center gap-1.5 px-2 text-xs font-semibold text-foreground/75">
                        <Globe2 className="size-3.5" aria-hidden="true" />
                        EN
                        <ChevronDown className="size-3" aria-hidden="true" />
                    </span>
                    {isAuthenticated ? (
                        <Link
                            href={dashboard()}
                            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 text-xs font-bold text-foreground transition-colors hover:border-brand hover:text-brand motion-reduce:transition-none"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={login()}
                                className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 text-xs font-bold text-foreground transition-colors hover:border-brand hover:text-brand motion-reduce:transition-none"
                            >
                                Login
                            </Link>
                            <Link
                                href={register()}
                                className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand px-5 text-xs font-bold text-brand-foreground shadow-sm transition-[transform,background-color] hover:bg-brand/90 motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-navigation"
                    className="inline-flex size-10 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-brand hover:text-brand motion-reduce:transition-none lg:hidden"
                    onClick={toggleMobileMenu}
                >
                    {mobileMenuOpen ? (
                        <X className="size-5" aria-hidden="true" />
                    ) : (
                        <Menu className="size-5" aria-hidden="true" />
                    )}
                </button>
            </div>

            <div
                id="mobile-navigation"
                aria-hidden={!mobileMenuOpen}
                inert={!mobileMenuOpen}
                className={cn(
                    'grid overflow-hidden border-t border-border/70 bg-background transition-[grid-template-rows,opacity] duration-300 motion-reduce:transition-none lg:hidden',
                    mobileMenuOpen
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'pointer-events-none grid-rows-[0fr] opacity-0',
                )}
            >
                <div className="min-h-0 overflow-hidden">
                    <nav
                        aria-label="Mobile navigation"
                        className="mx-auto grid max-w-7xl gap-1 px-5 py-4 sm:px-6"
                    >
                        {landingNavigation.map((item) => {
                            const itemHasChildren = hasChildren(item);
                            const isOpen = mobileOpenSection === item.label;
                            const childrenId = menuId('mobile', item.label);

                            return (
                                <div key={item.label}>
                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={item.href}
                                            className="flex min-h-11 flex-1 items-center rounded-md px-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-brand motion-reduce:transition-none"
                                            onClick={closeMenus}
                                        >
                                            {item.label}
                                        </Link>
                                        {itemHasChildren && (
                                            <button
                                                type="button"
                                                aria-label={`${isOpen ? 'Close' : 'Open'} ${item.label} menu`}
                                                aria-expanded={isOpen}
                                                aria-controls={childrenId}
                                                className="inline-flex size-10 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-brand motion-reduce:transition-none"
                                                onClick={() =>
                                                    setMobileOpenSection(
                                                        isOpen
                                                            ? null
                                                            : item.label,
                                                    )
                                                }
                                            >
                                                <ChevronDown
                                                    className={cn(
                                                        'size-4 transition-transform duration-200 motion-reduce:transition-none',
                                                        isOpen && 'rotate-180',
                                                    )}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        )}
                                    </div>
                                    {itemHasChildren && (
                                        <div
                                            id={childrenId}
                                            aria-hidden={!isOpen}
                                            inert={!isOpen}
                                            className={cn(
                                                'grid pl-6 transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none',
                                                isOpen
                                                    ? 'grid-rows-[1fr] opacity-100'
                                                    : 'pointer-events-none grid-rows-[0fr] opacity-0',
                                            )}
                                        >
                                            <div className="min-h-0 overflow-hidden">
                                                {item.children?.map((child) => {
                                                    const ChildIcon =
                                                        child.icon;

                                                    return (
                                                        <Link
                                                            key={child.label}
                                                            href={child.href}
                                                            className="flex min-h-10 items-center rounded-md px-3 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-brand"
                                                            onClick={closeMenus}
                                                        >
                                                            <ChildIcon
                                                                className="mr-2 size-3.5 text-brand"
                                                                aria-hidden="true"
                                                            />
                                                            {child.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div className="mt-3 grid gap-2 border-t border-border pt-4 sm:grid-cols-2">
                            {isAuthenticated ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-bold text-brand-foreground"
                                    onClick={closeMenus}
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-bold text-foreground"
                                        onClick={closeMenus}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-bold text-brand-foreground"
                                        onClick={closeMenus}
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}
