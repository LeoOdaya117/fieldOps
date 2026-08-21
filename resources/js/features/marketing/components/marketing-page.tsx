import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LandingHeader } from '@/features/landing/components/landing-header';
import type { MarketingPageConfig, MarketingSection } from '../types';
import { MarketingFooter } from './marketing-footer';
import { MarketingHero } from './marketing-hero';

type MarketingPageProps = {
    config: MarketingPageConfig;
    isAuthenticated: boolean;
};

type MarketingBodyProps = MarketingPageProps;

function PageStats({
    stats,
    label = 'FieldOps in practice',
}: {
    stats: MarketingPageConfig['stats'];
    label?: string;
}) {
    return (
        <section
            aria-label={label}
            className="bg-primary text-primary-foreground"
        >
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 divide-y divide-primary-foreground/20 px-5 py-7 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
                {stats.map(({ value, label: statLabel }) => (
                    <div
                        key={statLabel}
                        className="flex items-center gap-4 px-3 py-4 first:pl-0 last:pr-0 sm:justify-center sm:py-2"
                    >
                        <p className="text-3xl leading-none font-extrabold">
                            {value}
                        </p>
                        <p className="max-w-32 text-xs leading-5 text-primary-foreground/80">
                            {statLabel}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function SectionLabel({
    children,
    className,
}: {
    children: string;
    className?: string;
}) {
    return (
        <p
            className={cn(
                'text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase',
                className,
            )}
        >
            {children}
        </p>
    );
}

function CardRows({ cards }: { cards: MarketingSection['cards'] }) {
    return (
        <div className="mt-6 divide-y divide-border border-t border-border">
            {cards.map(({ icon: Icon, title, description, href }) => (
                <div key={title} className="flex gap-3 py-4">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                        <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-extrabold">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                        {href && (
                            <Link
                                href={href}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-brand hover:underline"
                            >
                                Learn more
                                <ArrowRight
                                    className="size-3"
                                    aria-hidden="true"
                                />
                            </Link>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function MarketingCta({
    config,
    isAuthenticated,
    tone = 'blue',
}: MarketingBodyProps & { tone?: 'blue' | 'light' }) {
    const primaryHref = isAuthenticated ? '/dashboard' : '/register';
    const primaryLabel = isAuthenticated
        ? 'Open Dashboard'
        : 'Get Started Free';
    const secondaryHref =
        config.heroVariant === 'about' ? '/resources' : '/about';
    const secondaryLabel =
        config.heroVariant === 'about'
            ? 'Explore resources'
            : 'Talk to our team';

    return (
        <section
            className={cn(
                'border-b border-border',
                tone === 'light' ? 'bg-muted/20' : 'bg-background',
            )}
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-20">
                <div
                    className={cn(
                        'rounded-2xl px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10',
                        tone === 'blue'
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-border bg-card',
                    )}
                >
                    <div className="max-w-2xl">
                        <SectionLabel
                            className={
                                tone === 'blue'
                                    ? 'text-primary-foreground/70'
                                    : undefined
                            }
                        >
                            {tone === 'blue'
                                ? 'A practical next step'
                                : 'Continue the conversation'}
                        </SectionLabel>
                        <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl">
                            {config.ctaTitle}
                        </h2>
                        <p
                            className={cn(
                                'mt-4 text-sm leading-6 sm:text-base',
                                tone === 'blue'
                                    ? 'text-primary-foreground/80'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {config.ctaDescription}
                        </p>
                    </div>
                    <div className="mt-7 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
                        <Link
                            href={primaryHref}
                            className={cn(
                                'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-extrabold transition-[transform,background-color,border-color] hover:-translate-y-0.5 motion-reduce:transition-none',
                                tone === 'blue'
                                    ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90'
                                    : 'bg-brand text-brand-foreground hover:bg-brand/90',
                            )}
                        >
                            {primaryLabel}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                        <Link
                            href={secondaryHref}
                            className={cn(
                                'inline-flex min-h-11 items-center justify-center rounded-lg border px-5 text-sm font-extrabold transition-colors hover:bg-brand/10 motion-reduce:transition-none',
                                tone === 'blue'
                                    ? 'border-primary-foreground/50 text-primary-foreground'
                                    : 'border-border text-brand hover:border-brand',
                            )}
                        >
                            {secondaryLabel}
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeaturesBody({ config, isAuthenticated }: MarketingBodyProps) {
    return (
        <>
            <PageStats stats={config.stats} label="FieldOps platform results" />
            <section className="border-b border-border bg-background">
                <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <div className="max-w-2xl">
                        <SectionLabel>
                            One platform, three working layers
                        </SectionLabel>
                        <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl">
                            Every feature works from the same operating record.
                        </h2>
                        <p className="mt-4 text-base leading-7 text-muted-foreground">
                            Start with the part of the operation that needs the
                            most clarity, then connect the surrounding context
                            as your team grows.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
                        {config.sections.map((section, index) => {
                            const SectionIcon =
                                section.cards[0]?.icon ?? Sparkles;

                            return (
                                <article
                                    key={section.id}
                                    id={section.id}
                                    aria-labelledby={`${section.id}-heading`}
                                    className="scroll-mt-24 bg-background p-6 sm:p-8"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                            <SectionIcon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span className="text-xs font-extrabold text-muted-foreground">
                                            0{index + 1}
                                        </span>
                                    </div>
                                    <p className="mt-7 text-[10px] font-extrabold tracking-[0.14em] text-brand uppercase">
                                        {section.eyebrow}
                                    </p>
                                    <h3
                                        id={`${section.id}-heading`}
                                        className="mt-3 text-xl leading-tight font-extrabold"
                                    >
                                        {section.title}
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                        {section.description}
                                    </p>
                                    <CardRows cards={section.cards} />
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>
            <MarketingCta
                config={config}
                isAuthenticated={isAuthenticated}
                tone="light"
            />
        </>
    );
}

function SolutionsBody({ config, isAuthenticated }: MarketingBodyProps) {
    return (
        <>
            <section className="border-b border-border bg-primary text-primary-foreground">
                <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-primary-foreground/20 bg-primary-foreground/20 sm:grid-cols-3">
                        {config.heroPanel.items.map((item, index) => (
                            <div
                                key={item.label}
                                className="bg-primary p-6 sm:p-7"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/10 text-xs font-extrabold">
                                        0{index + 1}
                                    </span>
                                    <p className="text-sm font-extrabold">
                                        {item.label}
                                    </p>
                                </div>
                                <p className="mt-4 text-lg leading-tight font-extrabold">
                                    {item.detail}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section className="border-b border-border bg-background">
                <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <div className="max-w-2xl">
                        <SectionLabel>One shared operating rhythm</SectionLabel>
                        <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl">
                            Build the handoffs around the people doing the work.
                        </h2>
                    </div>
                    <div className="mt-12 divide-y divide-border">
                        {config.sections.map((section, index) => (
                            <section
                                key={section.id}
                                id={section.id}
                                aria-labelledby={`${section.id}-heading`}
                                className="grid scroll-mt-24 gap-8 py-10 first:pt-0 last:pb-0 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16"
                            >
                                <div>
                                    <p className="text-4xl font-extrabold text-brand/30">
                                        0{index + 1}
                                    </p>
                                    <p className="mt-4 text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                                        {section.eyebrow}
                                    </p>
                                    <h3
                                        id={`${section.id}-heading`}
                                        className="mt-3 text-2xl leading-tight font-extrabold tracking-[-0.02em]"
                                    >
                                        {section.title}
                                    </h3>
                                    <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                                        {section.description}
                                    </p>
                                </div>
                                <CardRows cards={section.cards} />
                            </section>
                        ))}
                    </div>
                </div>
            </section>
            <MarketingCta config={config} isAuthenticated={isAuthenticated} />
        </>
    );
}

function IndustriesBody({ config, isAuthenticated }: MarketingBodyProps) {
    return (
        <>
            <PageStats
                stats={config.stats}
                label="Industries supported by FieldOps"
            />
            <section className="border-b border-border bg-muted/20">
                <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-2xl">
                            <SectionLabel>Where FieldOps fits</SectionLabel>
                            <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl">
                                Start with the conditions your team already
                                knows.
                            </h2>
                        </div>
                        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                            Use the same dependable foundation while keeping
                            each operation’s language, assets, and service
                            commitments visible.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-5 lg:grid-cols-3">
                        {config.sections.map((section) => {
                            const VisualIcon =
                                section.visual?.icon ??
                                section.cards[0]?.icon ??
                                Sparkles;

                            return (
                                <article
                                    key={section.id}
                                    id={section.id}
                                    aria-labelledby={`${section.id}-heading`}
                                    className="flex scroll-mt-24 flex-col border-t-4 border-brand bg-card p-6 shadow-sm sm:p-7"
                                >
                                    <span className="flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                        <VisualIcon
                                            className="size-6"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <p className="mt-7 text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                                        {section.eyebrow}
                                    </p>
                                    <h3
                                        id={`${section.id}-heading`}
                                        className="mt-3 text-xl leading-tight font-extrabold"
                                    >
                                        {section.title}
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                        {section.description}
                                    </p>
                                    {section.visual && (
                                        <div className="mt-7 border-y border-border py-4">
                                            <p className="text-[10px] font-extrabold tracking-[0.12em] text-brand uppercase">
                                                {section.visual.label}
                                            </p>
                                            <p className="mt-2 text-sm font-extrabold">
                                                {section.visual.title}
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                {section.visual.detail}
                                            </p>
                                        </div>
                                    )}
                                    <CardRows cards={section.cards} />
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>
            <MarketingCta
                config={config}
                isAuthenticated={isAuthenticated}
                tone="light"
            />
        </>
    );
}

function PricingBody({ config, isAuthenticated }: MarketingBodyProps) {
    const primaryHref = isAuthenticated ? '/dashboard' : '/register';

    return (
        <>
            <section
                id="plans"
                className="scroll-mt-24 border-b border-border bg-muted/20"
            >
                <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-2xl">
                            <SectionLabel>
                                Plans that grow with the work
                            </SectionLabel>
                            <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl">
                                Choose the level of control your operation needs
                                now.
                            </h2>
                        </div>
                        <div className="inline-flex w-fit items-center rounded-lg border border-border bg-card p-1 text-xs font-bold">
                            <span className="rounded-md bg-brand/10 px-3 py-2 text-brand">
                                Monthly
                            </span>
                            <span className="px-3 py-2 text-muted-foreground">
                                Annual
                            </span>
                            <span className="pr-2 text-success">Save 20%</span>
                        </div>
                    </div>
                    <div className="mt-12 grid gap-5 lg:grid-cols-3">
                        {config.sections.map((section, index) => {
                            const price =
                                config.heroPanel.items[index]?.detail ??
                                'Contact us';

                            return (
                                <article
                                    key={section.id}
                                    id={section.id}
                                    aria-labelledby={`${section.id}-heading`}
                                    className={cn(
                                        'flex scroll-mt-24 flex-col border bg-card p-6 sm:p-8',
                                        index === 1
                                            ? 'border-brand shadow-lg'
                                            : 'border-border shadow-sm',
                                    )}
                                >
                                    {index === 1 && (
                                        <span className="-mt-10 mb-5 w-fit rounded-full bg-brand px-3 py-1 text-[9px] font-extrabold tracking-[0.12em] text-brand-foreground uppercase">
                                            Most popular
                                        </span>
                                    )}
                                    <p className="text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                                        {section.eyebrow}
                                    </p>
                                    <h3
                                        id={`${section.id}-heading`}
                                        className="mt-3 text-2xl font-extrabold"
                                    >
                                        {price}
                                    </h3>
                                    <p className="mt-3 text-base font-extrabold">
                                        {section.title}
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {section.description}
                                    </p>
                                    <ul className="mt-7 grid flex-1 gap-3 border-t border-border pt-6">
                                        {section.cards.map(({ title }) => (
                                            <li
                                                key={title}
                                                className="flex items-start gap-2 text-sm"
                                            >
                                                <CheckCircle2
                                                    className="mt-0.5 size-4 shrink-0 text-brand"
                                                    aria-hidden="true"
                                                />
                                                <span>{title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        href={
                                            index === 2 ? '/about' : primaryHref
                                        }
                                        className={cn(
                                            'mt-8 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-sm font-extrabold transition-colors hover:border-brand hover:bg-brand/10',
                                            index === 1
                                                ? 'border-brand bg-brand text-brand-foreground hover:bg-brand/90'
                                                : 'border-border text-brand',
                                        )}
                                    >
                                        {index === 2
                                            ? 'Talk to sales'
                                            : 'Get started'}
                                    </Link>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>
            <MarketingCta config={config} isAuthenticated={isAuthenticated} />
        </>
    );
}

function ResourcesBody({ config, isAuthenticated }: MarketingBodyProps) {
    const [featured, ...secondary] = config.sections;

    return (
        <>
            <section className="border-b border-border bg-background">
                <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <div className="max-w-2xl">
                        <SectionLabel>
                            A useful library for the next step
                        </SectionLabel>
                        <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl">
                            Choose guidance by where your team is today.
                        </h2>
                    </div>
                    {featured && (
                        <section
                            id={featured.id}
                            aria-labelledby={`${featured.id}-heading`}
                            className="mt-12 grid scroll-mt-24 gap-8 border-y border-border py-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16"
                        >
                            <div>
                                <p className="text-2xl font-extrabold text-brand">
                                    01
                                </p>
                                <p className="mt-6 text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                                    {featured.eyebrow}
                                </p>
                                <h3
                                    id={`${featured.id}-heading`}
                                    className="mt-3 text-2xl leading-tight font-extrabold"
                                >
                                    {featured.title}
                                </h3>
                                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                                    {featured.description}
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-3">
                                {featured.cards.map(
                                    ({ icon: Icon, title, description }) => (
                                        <article
                                            key={title}
                                            className="border border-border bg-muted/20 p-5"
                                        >
                                            <Icon
                                                className="size-5 text-brand"
                                                aria-hidden="true"
                                            />
                                            <h4 className="mt-5 text-sm font-extrabold">
                                                {title}
                                            </h4>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                {description}
                                            </p>
                                        </article>
                                    ),
                                )}
                            </div>
                        </section>
                    )}
                    <div className="mt-10 grid gap-8 lg:grid-cols-2">
                        {secondary.map((section, index) => (
                            <section
                                key={section.id}
                                id={section.id}
                                aria-labelledby={`${section.id}-heading`}
                                className="scroll-mt-24 border-t-2 border-brand pt-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                                            {section.eyebrow}
                                        </p>
                                        <h3
                                            id={`${section.id}-heading`}
                                            className="mt-3 text-xl font-extrabold"
                                        >
                                            {section.title}
                                        </h3>
                                    </div>
                                    <span className="text-2xl font-extrabold text-brand/30">
                                        0{index + 2}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {section.description}
                                </p>
                                <CardRows cards={section.cards} />
                            </section>
                        ))}
                    </div>
                </div>
            </section>
            <MarketingCta
                config={config}
                isAuthenticated={isAuthenticated}
                tone="light"
            />
        </>
    );
}

function AboutBody({ config, isAuthenticated }: MarketingBodyProps) {
    const [story, ...principles] = config.sections;

    return (
        <>
            <section
                id="story"
                className="scroll-mt-24 border-b border-border bg-background"
            >
                <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8 lg:py-24">
                    <div>
                        <SectionLabel>
                            {story?.eyebrow ?? 'Our story'}
                        </SectionLabel>
                        <h2
                            id="story-heading"
                            className="mt-4 text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl"
                        >
                            {story?.title ??
                                'Good operations start with a clear picture.'}
                        </h2>
                        <p className="mt-5 text-base leading-7 text-muted-foreground">
                            {story?.description}
                        </p>
                    </div>
                    <div className="border-l-2 border-brand/20 pl-6 sm:pl-8">
                        {config.heroPanel.items.map((item, index) => (
                            <div
                                key={item.label}
                                className="relative pb-8 last:pb-0"
                            >
                                <span className="absolute top-0 -left-[2.05rem] flex size-7 items-center justify-center rounded-full border-4 border-background bg-brand text-[9px] font-extrabold text-brand-foreground sm:-left-[2.55rem]">
                                    0{index + 1}
                                </span>
                                <p className="text-base font-extrabold">
                                    {item.label}
                                </p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    {item.detail}
                                </p>
                            </div>
                        ))}
                        <blockquote className="mt-8 border-t border-border pt-6 text-lg leading-7 font-semibold">
                            “The best tools respect the people who use them
                            every day.”
                        </blockquote>
                    </div>
                </div>
            </section>
            <section className="border-b border-border bg-muted/20">
                <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
                        {principles.map((section) => (
                            <section
                                key={section.id}
                                id={section.id}
                                aria-labelledby={`${section.id}-heading`}
                                className="scroll-mt-24 bg-background p-7 sm:p-9"
                            >
                                <SectionLabel>{section.eyebrow}</SectionLabel>
                                <h3
                                    id={`${section.id}-heading`}
                                    className="mt-4 text-2xl leading-tight font-extrabold"
                                >
                                    {section.title}
                                </h3>
                                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                                    {section.description}
                                </p>
                                <CardRows cards={section.cards} />
                            </section>
                        ))}
                    </div>
                </div>
            </section>
            <MarketingCta config={config} isAuthenticated={isAuthenticated} />
        </>
    );
}

function MarketingPageBody({ config, isAuthenticated }: MarketingBodyProps) {
    switch (config.heroVariant) {
        case 'platform':
            return (
                <FeaturesBody
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'field':
            return (
                <SolutionsBody
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'industry':
            return (
                <IndustriesBody
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'pricing':
            return (
                <PricingBody
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'resources':
            return (
                <ResourcesBody
                    config={config}
                    isAuthenticated={isAuthenticated}
                />
            );
        case 'about':
            return (
                <AboutBody config={config} isAuthenticated={isAuthenticated} />
            );
    }
}

export function MarketingPage({ config, isAuthenticated }: MarketingPageProps) {
    return (
        <>
            <Head title={config.title} />
            <div className="marketing-page-shell min-h-svh overflow-x-clip bg-background text-foreground">
                <LandingHeader
                    isAuthenticated={isAuthenticated}
                    variant="marketing"
                />
                <main>
                    <MarketingHero
                        config={config}
                        isAuthenticated={isAuthenticated}
                    />
                    <MarketingPageBody
                        config={config}
                        isAuthenticated={isAuthenticated}
                    />
                </main>
                <MarketingFooter />
            </div>
        </>
    );
}
