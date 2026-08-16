import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { landingAssets } from '@/features/landing/data';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
    artwork,
}: AuthLayoutProps) {
    const artworkSrc = artwork?.src ?? landingAssets.fieldWorkerTablet;
    const artworkAlt = artwork?.alt ?? 'FieldOps city operations illustration';

    return (
        <div className="min-h-svh bg-background lg:grid lg:grid-cols-[0.9fr_1.1fr]">
            <aside className="relative hidden min-h-svh overflow-hidden bg-brand text-brand-foreground lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
                <img
                    src={artworkSrc}
                    alt={artworkAlt}
                    className="absolute inset-0 size-full object-cover opacity-35"
                    width="600"
                    height="512"
                />
                <div className="absolute inset-0 bg-brand/70" />
                <div className="relative z-10 flex items-center gap-3 text-lg font-bold">
                    <span className="flex size-10 items-center justify-center text-brand-foreground">
                        <AppLogoIcon className="size-9" aria-hidden="true" />
                    </span>
                    FieldOps
                </div>
                <div className="relative z-10 max-w-lg">
                    <p className="inline-flex items-center gap-2 rounded-full bg-brand-foreground/10 px-3 py-1.5 text-sm font-semibold">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Field operations, made clear
                    </p>
                    <h2 className="mt-6 text-4xl leading-tight font-bold tracking-tight xl:text-5xl">
                        Manage work. Empower teams. Deliver results.
                    </h2>
                    <p className="mt-5 max-w-md text-lg leading-8 text-brand-foreground">
                        Keep people, places, and progress connected from the
                        first assignment to the final sign-off.
                    </p>
                    <div className="mt-8 grid gap-3 text-sm font-medium">
                        <span className="inline-flex items-center gap-3">
                            <ShieldCheck
                                className="size-4"
                                aria-hidden="true"
                            />
                            Clear permissions and history
                        </span>
                        <span className="inline-flex items-center gap-3">
                            <ArrowRight className="size-4" aria-hidden="true" />
                            A shared view for every moving part
                        </span>
                    </div>
                </div>
                <p className="relative z-10 text-sm text-brand-foreground">
                    One workspace for the work behind the work.
                </p>
            </aside>

            <main className="flex min-h-svh items-center px-5 py-10 sm:px-8 lg:px-12 xl:px-20">
                <div className="mx-auto flex w-full max-w-md flex-col justify-center space-y-8">
                    <Link
                        href={home()}
                        className="flex items-center gap-3 self-start font-bold lg:hidden"
                    >
                        <span className="flex size-10 items-center justify-center text-brand">
                            <AppLogoIcon
                                className="size-9"
                                aria-hidden="true"
                            />
                        </span>
                        <span>FieldOps</span>
                    </Link>
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {title}
                        </h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
