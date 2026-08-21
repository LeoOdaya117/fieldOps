import { Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketingHeroPanel, MarketingPageConfig } from '../types';

type MarketingHeroProps = {
    config: MarketingPageConfig;
    isAuthenticated: boolean;
};

type HeroCopyProps = MarketingHeroProps & {
    align?: 'left' | 'center';
};

function HeroActions({
    isAuthenticated,
    align = 'left',
}: Pick<MarketingHeroProps, 'isAuthenticated'> & {
    align?: 'left' | 'center';
}) {
    const primaryHref = isAuthenticated ? '/dashboard' : '/register';
    const primaryLabel = isAuthenticated
        ? 'Open Dashboard'
        : 'Get Started Free';

    return (
        <div
            className={cn(
                'mt-8 flex flex-col gap-3 sm:flex-row',
                align === 'center' && 'justify-center',
            )}
        >
            <Link
                href={primaryHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-extrabold text-primary-foreground shadow-sm transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md motion-reduce:transition-none dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90"
            >
                {primaryLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-extrabold text-foreground transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-brand hover:bg-brand/5 hover:text-brand motion-reduce:transition-none"
            >
                Back to overview
                <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
        </div>
    );
}

function HeroCopy({ config, isAuthenticated, align = 'left' }: HeroCopyProps) {
    return (
        <div
            className={cn(
                'max-w-2xl motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:animate-none',
                align === 'center' && 'mx-auto text-center',
            )}
        >
            <p className="inline-flex rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.14em] text-brand uppercase">
                {config.eyebrow}
            </p>
            <h1 className="mt-6 text-4xl leading-[1.06] font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-[3.8rem]">
                {config.title}
            </h1>
            <p
                className={cn(
                    'mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg',
                    align === 'center' && 'mx-auto',
                )}
            >
                {config.description}
            </p>
            <HeroActions isAuthenticated={isAuthenticated} align={align} />
        </div>
    );
}

function HeroPanel({
    panel,
    className,
    dark = false,
}: {
    panel: MarketingHeroPanel;
    className?: string;
    dark?: boolean;
}) {
    return (
        <div
            className={cn(
                'rounded-2xl border p-5 shadow-lg sm:p-6',
                dark
                    ? 'border-primary-foreground/20 bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground',
                className,
            )}
        >
            <p
                className={cn(
                    'text-[10px] font-extrabold tracking-[0.15em] uppercase',
                    dark ? 'text-primary-foreground/70' : 'text-brand',
                )}
            >
                {panel.eyebrow}
            </p>
            <p className="mt-3 max-w-sm text-xl leading-tight font-extrabold tracking-[-0.02em]">
                {panel.title}
            </p>
            {panel.description && (
                <p
                    className={cn(
                        'mt-3 max-w-md text-sm leading-6',
                        dark
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground',
                    )}
                >
                    {panel.description}
                </p>
            )}
            <div
                className={cn(
                    'mt-5 divide-y',
                    dark ? 'divide-primary-foreground/15' : 'divide-border',
                )}
            >
                {panel.items.map((item, index) => (
                    <div
                        key={item.label}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                        <span
                            className={cn(
                                'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold',
                                dark
                                    ? 'bg-primary-foreground/10 text-primary-foreground'
                                    : 'bg-brand/10 text-brand',
                            )}
                        >
                            0{index + 1}
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-extrabold">
                                {item.label}
                            </span>
                            <span
                                className={cn(
                                    'mt-0.5 block text-xs',
                                    dark
                                        ? 'text-primary-foreground/70'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {item.detail}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HeroImage({
    config,
    className,
}: {
    config: MarketingPageConfig;
    className?: string;
}) {
    if (!config.heroImage) {
        return null;
    }

    return (
        <img
            src={config.heroImage}
            alt={config.heroImageAlt ?? ''}
            className={cn('w-full object-contain drop-shadow-xl', className)}
            width="1536"
            height="1024"
        />
    );
}

function PlatformHero({ config, isAuthenticated }: MarketingHeroProps) {
    return (
        <section className="border-b border-border bg-muted/25">
            <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 lg:px-8 lg:py-24">
                <HeroCopy config={config} isAuthenticated={isAuthenticated} />
                <div className="relative min-w-0 motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-reduce:animate-none">
                    <HeroImage config={config} />
                    <HeroPanel
                        panel={config.heroPanel}
                        className="relative mt-6 sm:absolute sm:right-4 sm:bottom-[-3rem] sm:left-4 sm:mt-0 lg:right-8 lg:left-auto lg:w-72"
                    />
                </div>
            </div>
        </section>
    );
}

function FieldHero({ config, isAuthenticated }: MarketingHeroProps) {
    return (
        <section className="border-b border-border bg-background">
            <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-24">
                <div className="relative order-2 lg:order-1">
                    <HeroImage config={config} />
                    <div className="absolute bottom-5 left-5 max-w-xs rounded-xl border border-border bg-card p-4 shadow-lg sm:bottom-8 sm:left-8">
                        <p className="text-xs font-extrabold">
                            The same picture, wherever work happens.
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Keep the office informed without adding more steps
                            for the crew.
                        </p>
                    </div>
                </div>
                <div className="order-1 lg:order-2">
                    <HeroCopy
                        config={config}
                        isAuthenticated={isAuthenticated}
                    />
                    <HeroPanel panel={config.heroPanel} className="mt-8" />
                </div>
            </div>
        </section>
    );
}

function IndustryHero({ config, isAuthenticated }: MarketingHeroProps) {
    return (
        <section className="border-b border-border bg-muted/20">
            <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
                <HeroCopy
                    config={config}
                    isAuthenticated={isAuthenticated}
                    align="center"
                />
                <div className="relative mt-12">
                    <HeroImage config={config} />
                    <HeroPanel
                        panel={config.heroPanel}
                        className="relative mt-4 w-full sm:absolute sm:right-4 sm:bottom-[-4rem] sm:mt-0 sm:w-80 lg:right-10"
                    />
                </div>
            </div>
        </section>
    );
}

function PricingHero({ config, isAuthenticated }: MarketingHeroProps) {
    return (
        <section className="border-b border-border bg-background">
            <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-24">
                <HeroCopy config={config} isAuthenticated={isAuthenticated} />
                <div className="rounded-2xl border border-border bg-muted/20 p-3 sm:p-5">
                    <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
                        <p className="text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                            {config.heroPanel.eyebrow}
                        </p>
                        <h2 className="mt-3 max-w-md text-2xl leading-tight font-extrabold tracking-[-0.03em]">
                            {config.heroPanel.title}
                        </h2>
                        {config.heroPanel.description && (
                            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                                {config.heroPanel.description}
                            </p>
                        )}
                        <div className="mt-6 grid gap-3">
                            {config.heroPanel.items.map((item, index) => (
                                <div
                                    key={item.label}
                                    className={cn(
                                        'flex items-center justify-between gap-4 rounded-xl border p-4',
                                        index === 1
                                            ? 'border-brand bg-brand/5'
                                            : 'border-border bg-background',
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-xs font-extrabold text-brand">
                                            0{index + 1}
                                        </span>
                                        <span>
                                            <span className="block text-sm font-extrabold">
                                                {item.label}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                                {item.detail}
                                            </span>
                                        </span>
                                    </div>
                                    {index === 1 && (
                                        <span className="rounded-full bg-brand px-2 py-1 text-[9px] font-extrabold text-brand-foreground uppercase">
                                            Popular
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                            <CheckCircle2
                                className="size-4 text-success"
                                aria-hidden="true"
                            />
                            Start small, add depth when the work calls for it.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

function ResourcesHero({ config, isAuthenticated }: MarketingHeroProps) {
    return (
        <section className="border-b border-border bg-muted/25">
            <div className="mx-auto grid w-full max-w-7xl items-start gap-12 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16 lg:px-8 lg:py-24">
                <HeroCopy config={config} isAuthenticated={isAuthenticated} />
                <div className="relative min-w-0">
                    <HeroImage config={config} />
                    <HeroPanel
                        panel={config.heroPanel}
                        dark
                        className="relative mt-6 sm:mx-8 sm:mt-8"
                    />
                </div>
            </div>
        </section>
    );
}

function AboutHero({ config, isAuthenticated }: MarketingHeroProps) {
    return (
        <section className="border-b border-border bg-background">
            <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.84fr_1.16fr] lg:gap-16 lg:px-8 lg:py-24">
                <HeroCopy config={config} isAuthenticated={isAuthenticated} />
                <div className="relative">
                    <HeroImage config={config} />
                    <div className="relative mt-4 border-l-4 border-brand bg-card p-4 shadow-lg sm:absolute sm:right-8 sm:bottom-[-3rem] sm:left-8 sm:mt-0">
                        <p className="text-sm leading-6 font-semibold">
                            “The best tools respect the people who use them
                            every day.”
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            A simple idea behind FieldOps
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function MarketingHero({ config, isAuthenticated }: MarketingHeroProps) {
    switch (config.heroVariant) {
        case 'platform':
            return (
                <PlatformHero
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'field':
            return (
                <FieldHero config={config} isAuthenticated={isAuthenticated} />
            );
        case 'industry':
            return (
                <IndustryHero
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'pricing':
            return (
                <PricingHero
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'resources':
            return (
                <ResourcesHero
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'about':
            return (
                <AboutHero config={config} isAuthenticated={isAuthenticated} />
            );
    }
}
