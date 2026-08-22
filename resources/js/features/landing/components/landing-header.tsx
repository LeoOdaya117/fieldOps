import { Link } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';
import { dashboard, login, register } from '@/routes';
import { landingJourneyNavigation } from '../data';

type LandingHeaderProps = {
    isAuthenticated: boolean;
};

export function LandingHeader({ isAuthenticated }: LandingHeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', closeOnEscape);

        return () => window.removeEventListener('keydown', closeOnEscape);
    }, []);

    const closeMenu = () => setMobileMenuOpen(false);

    return (
        <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
            <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-5 px-5 sm:px-6 lg:px-8">
                <a
                    href="#top"
                    aria-label="FieldOps home"
                    className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    onClick={closeMenu}
                >
                    <span className="flex size-9 items-center justify-center text-brand">
                        <AppLogoIcon className="size-8" aria-hidden="true" />
                    </span>
                    <span className="text-base font-extrabold tracking-[-0.04em] text-foreground sm:text-lg">
                        FIELDOPS
                    </span>
                </a>

                <nav
                    aria-label="Main navigation"
                    className="hidden items-center gap-1 lg:flex"
                >
                    {landingJourneyNavigation.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className="inline-flex min-h-10 items-center rounded-full px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand motion-reduce:transition-none"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-2 lg:flex">
                    {isAuthenticated ? (
                        <Link
                            href={dashboard()}
                            className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary/90 motion-reduce:transition-none dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90"
                        >
                            Open Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={login()}
                                className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted hover:text-brand motion-reduce:transition-none"
                            >
                                Login
                            </Link>
                            <Link
                                href={register()}
                                className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary/90 motion-reduce:transition-none dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90"
                            >
                                Start Free
                            </Link>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-navigation"
                    className="inline-flex size-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-brand hover:text-brand motion-reduce:transition-none lg:hidden"
                    onClick={() => setMobileMenuOpen((open) => !open)}
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
                        {landingJourneyNavigation.map((item) => (
                            <a
                                key={item.label}
                                href={item.href}
                                className="flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-brand motion-reduce:transition-none"
                                onClick={closeMenu}
                            >
                                {item.label}
                            </a>
                        ))}
                        <div className="mt-3 grid gap-2 border-t border-border pt-4">
                            {isAuthenticated ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground dark:bg-brand dark:text-brand-foreground"
                                    onClick={closeMenu}
                                >
                                    Open Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-bold text-foreground"
                                        onClick={closeMenu}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href={register()}
                                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground dark:bg-brand dark:text-brand-foreground"
                                        onClick={closeMenu}
                                    >
                                        Start Free
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
