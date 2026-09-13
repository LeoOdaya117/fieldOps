import { Link, usePage } from '@inertiajs/react';
import { PlatformLogo } from '@/components/platform-logo';
import { dashboard, login } from '@/routes';
import { landingJourneyNavigation } from '../data';

export function LandingFooter({
    isAuthenticated,
}: {
    isAuthenticated: boolean;
}) {
    const { system } = usePage().props;
    const platformName = system?.name ?? 'FieldOps';

    return (
        <footer className="border-t border-primary-foreground/15 bg-primary text-primary-foreground">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <div className="max-w-sm">
                    <a
                        href="#top"
                        className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-foreground"
                        aria-label={`${platformName} home`}
                    >
                        <PlatformLogo
                            variant="wordmark-on-dark"
                            className="h-9 max-w-52"
                            markClassName="size-8"
                        />
                    </a>
                    <p className="mt-4 text-sm leading-6 text-primary-foreground/70">
                        One connected operating system for the teams
                        coordinating and completing work in the field.
                    </p>
                </div>

                <nav
                    aria-label="Footer navigation"
                    className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-primary-foreground/70"
                >
                    {landingJourneyNavigation.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            className="transition-colors hover:text-primary-foreground motion-reduce:transition-none"
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                        <Link
                            href={dashboard()}
                            className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary-foreground px-5 text-xs font-extrabold text-primary"
                        >
                            Open Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={login()}
                                className="inline-flex min-h-10 items-center justify-center rounded-full px-4 text-xs font-bold text-primary-foreground/75 hover:text-primary-foreground"
                            >
                                Login
                            </Link>
                        </>
                    )}
                </div>
            </div>
            <div className="border-t border-primary-foreground/15">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-4 text-[10px] text-primary-foreground/75 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <p>
                        © {new Date().getFullYear()} {platformName}.
                    </p>
                    <p>Made for the teams keeping essential work moving.</p>
                </div>
            </div>
        </footer>
    );
}
