import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    CheckCircle2,
    ClipboardCheck,
    MapPinned,
    Quote,
    UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ScrollReveal } from '@/components/scroll-reveal';
import { cn } from '@/lib/utils';
import { dashboard, register } from '@/routes';
import { MarketingFooter } from '@/features/marketing/components/marketing-footer';
import {
    landingAssets,
    landingFeatures,
    landingPlans,
    landingStats,
    landingTestimonials,
    trustedOrganizations,
} from '../data';
import { LandingFaq } from './landing-faq';
import { LandingHeader } from './landing-header';

type LandingPageProps = {
    isAuthenticated: boolean;
};

const statIcons: LucideIcon[] = [
    UsersRound,
    ClipboardCheck,
    MapPinned,
    BarChart3,
];

const featureAccentClasses = [
    'bg-info/10 text-info',
    'bg-success/10 text-success',
    'bg-brand/10 text-brand',
    'bg-warning/15 text-warning',
    'bg-destructive/10 text-destructive',
    'bg-info/10 text-info',
];

export function LandingPage({ isAuthenticated }: LandingPageProps) {
    const primaryHref = isAuthenticated ? dashboard() : register();
    const primaryLabel = isAuthenticated
        ? 'Open Dashboard'
        : 'Get Started Free';

    return (
        <>
            <Head title="Manage Work. Empower Teams. Deliver Results." />
            <div className="min-h-svh overflow-x-clip bg-background text-foreground">
                <LandingHeader isAuthenticated={isAuthenticated} />

                <main>
                    <section
                        aria-labelledby="landing-hero-heading"
                        className="relative overflow-hidden border-b border-border bg-background"
                    >
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-45"
                            style={{
                                backgroundImage: `url(${landingAssets.heroBackground})`,
                            }}
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-background/75"
                        />
                        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-8 px-5 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-8 lg:px-8 lg:py-14">
                            <div className="max-w-xl motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:animate-none">
                                <p className="inline-flex rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[9px] font-extrabold tracking-[0.12em] text-brand uppercase">
                                    All-in-one field operations platform
                                </p>
                                <h1
                                    id="landing-hero-heading"
                                    className="mt-5 text-4xl leading-[1.06] font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-[3.4rem]"
                                >
                                    Manage Work.
                                    <br />
                                    Empower Teams.
                                    <br />
                                    <span className="text-brand">
                                        Deliver Results.
                                    </span>
                                </h1>
                                <p className="mt-4 max-w-md text-sm leading-6 text-foreground/80 sm:text-base">
                                    FieldOps helps organizations streamline
                                    field operations, manage work orders,
                                    assets, and inspections, and resolve issues
                                    faster — all in one powerful platform.
                                </p>

                                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                                    <Link
                                        href={primaryHref}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-xs font-extrabold text-brand-foreground shadow-sm transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-brand/90 hover:shadow-md motion-reduce:transition-none"
                                    >
                                        {primaryLabel}
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                    <a
                                        href="#solutions"
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand/25 bg-card/80 px-5 text-xs font-extrabold text-brand transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-brand hover:bg-brand/5 motion-reduce:transition-none"
                                    >
                                        <span className="flex size-5 items-center justify-center rounded-full border border-brand text-[10px] text-brand">
                                            <span aria-hidden="true">▶</span>
                                        </span>
                                        Watch Demo
                                    </a>
                                </div>

                                <div className="mt-7 grid max-w-xl grid-cols-3 gap-3 border-t border-border/80 pt-4 text-[9px] font-bold text-muted-foreground sm:gap-5 sm:text-[10px]">
                                    {[
                                        'No credit card required',
                                        'Easy setup',
                                        'Cancel anytime',
                                    ].map((item) => (
                                        <span
                                            key={item}
                                            className="flex items-start gap-2"
                                        >
                                            <CheckCircle2
                                                className="mt-0.5 size-3.5 shrink-0 text-success"
                                                aria-hidden="true"
                                            />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="relative min-w-0 motion-safe:animate-in motion-safe:duration-500 motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-reduce:animate-none lg:-mr-16">
                                <img
                                    src={landingAssets.heroDashboard}
                                    alt="FieldOps operations dashboard on a laptop beside a work-order phone"
                                    className="relative z-10 w-full object-contain drop-shadow-xl"
                                    width="1536"
                                    height="1024"
                                />
                            </div>
                        </div>
                    </section>

                    <section
                        aria-labelledby="trusted-heading"
                        className="border-b border-border bg-card"
                    >
                        <ScrollReveal className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
                            <div className="text-center">
                                <p
                                    id="trusted-heading"
                                    className="text-[9px] font-extrabold tracking-[0.16em] text-brand uppercase"
                                >
                                    Trusted by operations teams nationwide
                                </p>
                            </div>
                            <div className="mt-5 grid grid-cols-2 gap-5 text-center text-xs font-extrabold text-muted-foreground sm:grid-cols-5">
                                {trustedOrganizations.map((organization) => (
                                    <span
                                        key={organization}
                                        className="flex items-center justify-center gap-2 px-2 py-2 transition-colors hover:text-brand"
                                    >
                                        <span
                                            className="flex size-6 items-center justify-center rounded-md bg-muted text-[10px] text-brand"
                                            aria-hidden="true"
                                        >
                                            ◇
                                        </span>
                                        {organization}
                                    </span>
                                ))}
                            </div>
                        </ScrollReveal>
                    </section>

                    <section
                        id="features"
                        aria-labelledby="features-heading"
                        className="scroll-mt-20 bg-background"
                    >
                        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                            <ScrollReveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                                        Features
                                    </p>
                                    <h2
                                        id="features-heading"
                                        className="mt-3 max-w-xl text-3xl leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-4xl"
                                    >
                                        Everything you need to run
                                        <br className="hidden sm:block" /> field
                                        operations efficiently
                                    </h2>
                                </div>
                                <Link
                                    href="/features"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                                >
                                    View all features
                                    <ArrowRight
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </ScrollReveal>

                            <ScrollReveal
                                className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                                delay={100}
                            >
                                {landingFeatures.map(
                                    (
                                        { icon: Icon, title, description },
                                        index,
                                    ) => (
                                        <ScrollReveal
                                            key={title}
                                            delay={index * 70}
                                        >
                                            <article className="group relative flex min-h-48 flex-col rounded-lg border border-border bg-card p-5 transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md motion-reduce:transition-none">
                                                <span
                                                    className={cn(
                                                        'flex size-10 items-center justify-center rounded-full border border-transparent transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none',
                                                        featureAccentClasses[
                                                            index
                                                        ],
                                                    )}
                                                >
                                                    <Icon
                                                        className="size-5"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                                <h3 className="mt-5 text-sm leading-5 font-extrabold tracking-tight">
                                                    {title}
                                                </h3>
                                                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                                                    {description}
                                                </p>
                                                <Link
                                                    href="/features"
                                                    className="mt-5 inline-flex items-center gap-1 text-xs font-extrabold text-brand hover:underline"
                                                >
                                                    Learn more
                                                    <ArrowRight
                                                        className="size-3"
                                                        aria-hidden="true"
                                                    />
                                                </Link>
                                            </article>
                                        </ScrollReveal>
                                    ),
                                )}
                            </ScrollReveal>
                        </div>
                    </section>

                    <section
                        aria-label="FieldOps results"
                        className="bg-brand text-brand-foreground"
                    >
                        <ScrollReveal className="mx-auto grid w-full max-w-7xl grid-cols-2 divide-x divide-y divide-brand-foreground/20 px-5 py-6 sm:px-6 md:grid-cols-4 md:divide-y-0 lg:px-8">
                            {landingStats.map(({ value, label }, index) => {
                                const Icon = statIcons[index];

                                return (
                                    <div
                                        key={label}
                                        className="flex items-center justify-center gap-3 px-3 py-3 first:pl-0 last:pr-0 sm:gap-4"
                                    >
                                        <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg border border-brand-foreground/20 bg-brand-foreground/10 sm:flex">
                                            <Icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div>
                                            <p className="text-2xl leading-none font-extrabold sm:text-3xl">
                                                {value}
                                            </p>
                                            <p className="mt-1 text-[10px] font-semibold text-brand-foreground/80 sm:text-xs">
                                                {label}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </ScrollReveal>
                    </section>

                    <section
                        id="solutions"
                        aria-labelledby="solutions-heading"
                        className="relative scroll-mt-20 overflow-hidden bg-background"
                    >
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15"
                            style={{
                                backgroundImage: `url(${landingAssets.midSectionBackground})`,
                            }}
                        />
                        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-8 lg:py-24">
                            <ScrollReveal
                                className="relative min-w-0"
                                direction="left"
                            >
                                <img
                                    src={landingAssets.fieldWorkerTablet}
                                    alt="Field worker reviewing a work order on a tablet beside a city waterway"
                                    className="w-full object-contain drop-shadow-xl"
                                    width="1440"
                                    height="1152"
                                    loading="lazy"
                                />
                                <div className="absolute top-5 left-5 rounded-full border border-border bg-card px-3 py-1.5 text-[9px] font-extrabold tracking-[0.14em] text-brand uppercase shadow-sm">
                                    Built for field teams
                                </div>
                                <div className="absolute bottom-5 left-5 flex max-w-[15rem] items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-lg sm:bottom-7 sm:left-7">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                                        <CheckCircle2
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <p className="text-xs font-extrabold">
                                            Work order completed
                                        </p>
                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                            WO-2024-0128 · Main St. Pump Station
                                        </p>
                                    </div>
                                </div>
                            </ScrollReveal>

                            <ScrollReveal direction="right" delay={100}>
                                <p className="inline-flex rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] text-brand uppercase">
                                    Built for field teams
                                </p>
                                <h2
                                    id="solutions-heading"
                                    className="mt-5 max-w-lg text-3xl leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-4xl"
                                >
                                    Work smarter in the field and in the office
                                </h2>
                                <ul className="mt-8 grid gap-3 text-sm text-foreground/85">
                                    {[
                                        'Real-time updates and notifications',
                                        'Mobile ready — works online & offline',
                                        'Secure and reliable data',
                                        'Easy to use for field and office teams',
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-3"
                                        >
                                            <CheckCircle2
                                                className="mt-0.5 size-4 shrink-0 text-brand"
                                                aria-hidden="true"
                                            />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={primaryHref}
                                    className="mt-7 inline-flex items-center gap-2 rounded-lg border border-brand/25 bg-brand/10 px-4 py-3 text-sm font-extrabold text-brand transition-[transform,border-color] hover:-translate-y-0.5 hover:border-brand/50 hover:underline motion-reduce:transition-none"
                                >
                                    Learn how FieldOps can help your team
                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </ScrollReveal>
                        </div>
                    </section>

                    <section
                        id="resources"
                        aria-labelledby="resources-heading"
                        className="scroll-mt-20 bg-background"
                    >
                        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:px-8 lg:py-24">
                            <ScrollReveal direction="left">
                                <p className="inline-flex rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                                    What our customers say
                                </p>
                                <h2
                                    id="resources-heading"
                                    className="mt-5 max-w-sm text-3xl leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-4xl"
                                >
                                    Trusted by teams that keep the world running
                                </h2>
                                <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                                    Clearer handoffs, faster answers, and a more
                                    reliable view of the work are good outcomes
                                    for every team.
                                </p>
                            </ScrollReveal>
                            <ScrollReveal
                                className="grid gap-4 md:grid-cols-2"
                                direction="right"
                                delay={100}
                            >
                                {landingTestimonials
                                    .slice(0, 2)
                                    .map((testimonial) => (
                                        <figure
                                            key={testimonial.name}
                                            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md motion-reduce:transition-none"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="flex size-10 items-center justify-center rounded-lg bg-brand text-sm font-extrabold text-brand-foreground">
                                                    {testimonial.name.charAt(0)}
                                                </span>
                                                <Quote
                                                    className="size-6 text-brand/70"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <blockquote className="mt-4 text-sm leading-6">
                                                “{testimonial.quote}”
                                            </blockquote>
                                            <figcaption className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                                                <span className="font-extrabold text-foreground">
                                                    — {testimonial.name}
                                                </span>
                                                <br />
                                                {testimonial.role},{' '}
                                                {testimonial.organization}
                                            </figcaption>
                                        </figure>
                                    ))}
                            </ScrollReveal>
                        </div>
                    </section>

                    <section
                        id="pricing"
                        aria-labelledby="pricing-heading"
                        className="scroll-mt-20 bg-muted/20"
                    >
                        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                            <ScrollReveal className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                                        Pricing
                                    </p>
                                    <h2
                                        id="pricing-heading"
                                        className="mt-3 text-3xl leading-[1.08] font-extrabold tracking-[-0.03em] sm:text-4xl"
                                    >
                                        Simple, transparent pricing
                                    </h2>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Choose the plan that fits your
                                        organization.
                                    </p>
                                </div>
                                <span className="inline-flex w-fit items-center rounded-lg border border-border bg-card p-1 text-[10px] font-bold">
                                    <span className="rounded-md bg-brand/10 px-3 py-1.5 text-brand">
                                        Monthly
                                    </span>
                                    <span className="px-3 py-1.5 text-muted-foreground">
                                        Annual
                                    </span>
                                    <span className="pr-2 text-success">
                                        Save 20%
                                    </span>
                                </span>
                            </ScrollReveal>

                            <div className="mt-10 grid gap-4 lg:grid-cols-3">
                                {landingPlans.map((plan, index) => (
                                    <ScrollReveal
                                        key={plan.name}
                                        delay={index * 80}
                                    >
                                        <article
                                            className={cn(
                                                'relative flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none',
                                                plan.featured
                                                    ? 'border-brand shadow-md'
                                                    : 'border-border',
                                            )}
                                        >
                                            {plan.featured && (
                                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[9px] font-extrabold tracking-[0.1em] text-brand-foreground uppercase">
                                                    Most popular
                                                </span>
                                            )}
                                            <h3 className="text-lg font-extrabold">
                                                {plan.name}
                                            </h3>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {plan.description}
                                            </p>
                                            <p className="mt-6 text-4xl font-extrabold tracking-tight">
                                                {plan.price}
                                                {plan.price !== 'Custom' && (
                                                    <span className="ml-1 text-sm font-semibold text-muted-foreground">
                                                        /user/month
                                                    </span>
                                                )}
                                            </p>
                                            <ul className="mt-6 grid flex-1 gap-3 text-sm text-muted-foreground">
                                                {plan.features.map(
                                                    (feature) => (
                                                        <li
                                                            key={feature}
                                                            className="flex items-start gap-2"
                                                        >
                                                            <CheckCircle2
                                                                className="mt-0.5 size-4 shrink-0 text-brand"
                                                                aria-hidden="true"
                                                            />
                                                            <span>
                                                                {feature}
                                                            </span>
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                            <Link
                                                href={
                                                    plan.name === 'Enterprise'
                                                        ? '#about'
                                                        : register()
                                                }
                                                className={cn(
                                                    'mt-7 inline-flex min-h-11 items-center justify-center rounded-lg border px-4 text-xs font-extrabold transition-[transform,background-color,border-color] hover:-translate-y-0.5 motion-reduce:transition-none',
                                                    plan.featured
                                                        ? 'border-brand bg-brand text-brand-foreground hover:bg-brand/90'
                                                        : 'border-border text-brand hover:border-brand hover:bg-brand/5',
                                                )}
                                            >
                                                {plan.actionLabel}
                                            </Link>
                                        </article>
                                    </ScrollReveal>
                                ))}
                            </div>
                            <p className="mt-5 text-center text-xs text-muted-foreground">
                                Need a custom plan?{' '}
                                <a
                                    href="#about"
                                    className="font-bold text-brand hover:underline"
                                >
                                    Contact our sales team
                                    <ArrowRight
                                        className="ml-1 inline size-3"
                                        aria-hidden="true"
                                    />
                                </a>
                            </p>
                        </div>
                    </section>

                    <LandingFaq />

                    <section
                        id="about"
                        aria-labelledby="about-heading"
                        className="scroll-mt-20 bg-brand text-brand-foreground"
                    >
                        <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-5 py-10 sm:px-6 md:grid-cols-[0.65fr_1.35fr] lg:px-8 lg:py-12">
                            <ScrollReveal direction="left">
                                <img
                                    src={landingAssets.ctaMobileCard}
                                    alt="FieldOps mobile work order screen and completed work card"
                                    className="mx-auto w-full max-w-xs object-contain md:mx-0"
                                    width="1536"
                                    height="1024"
                                    loading="lazy"
                                />
                            </ScrollReveal>
                            <ScrollReveal
                                className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
                                direction="right"
                                delay={100}
                            >
                                <div>
                                    <p className="text-[10px] font-extrabold tracking-[0.14em] text-brand-foreground/70 uppercase">
                                        A better way to keep work moving
                                    </p>
                                    <h2
                                        id="about-heading"
                                        className="mt-4 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl"
                                    >
                                        Ready to streamline your field
                                        operations?
                                    </h2>
                                </div>
                                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                                    <Link
                                        href={primaryHref}
                                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-foreground px-4 text-xs font-extrabold text-brand transition-colors hover:bg-brand-foreground/90"
                                    >
                                        {primaryLabel}
                                    </Link>
                                    <a
                                        href="#resources"
                                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-foreground/50 px-4 text-xs font-extrabold text-brand-foreground transition-colors hover:bg-brand-foreground/10"
                                    >
                                        Schedule a Demo
                                    </a>
                                </div>
                            </ScrollReveal>
                        </div>
                    </section>
                </main>

                <MarketingFooter />
            </div>
        </>
    );
}
