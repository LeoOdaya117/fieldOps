import { Link } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowRight,
    Camera,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleDot,
    CloudOff,
    Download,
    FileCheck2,
    MapPinned,
    MoreHorizontal,
    Navigation,
    Paperclip,
    RefreshCw,
    Send,
    Signal,
    Smartphone,
    Timer,
    WifiOff,
} from 'lucide-react';
import { ScrollReveal } from '@/components/scroll-reveal';
import { cn } from '@/lib/utils';
import type { RouteDefinition } from '@/wayfinder';
import {
    landingCapabilities,
    landingMapJobs,
    landingMetrics,
    landingWorkflowSteps,
    landingAssets,
} from '../data';
import type {
    LandingCapability,
    LandingMapJob,
    LandingWorkflowStep,
} from '../types';

const toneClasses = {
    brand: 'bg-brand/10 text-brand border-brand/20',
    info: 'bg-info/10 text-info border-info/20',
    warning: 'bg-warning/15 text-warning border-warning/25',
    success: 'bg-success/10 text-success border-success/20',
} as const;

const statusClasses = {
    Assigned: 'bg-warning/15 text-warning',
    'In progress': 'bg-info/10 text-info',
    'Needs review': 'bg-destructive/10 text-destructive',
} as const;

const priorityClasses = {
    High: 'text-destructive',
    Medium: 'text-warning',
    Low: 'text-success',
} as const;

function SectionKicker({
    children,
    className,
}: {
    children: string;
    className?: string;
}) {
    return (
        <p
            className={cn(
                'text-[10px] font-extrabold tracking-[0.17em] text-brand uppercase',
                className,
            )}
        >
            {children}
        </p>
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
    light = false,
    id,
}: {
    eyebrow: string;
    title: string;
    description?: string;
    light?: boolean;
    id?: string;
}) {
    return (
        <div className="max-w-2xl">
            <SectionKicker
                className={light ? 'text-primary-foreground/75' : undefined}
            >
                {eyebrow}
            </SectionKicker>
            <h2
                id={id}
                className={cn(
                    'mt-4 text-3xl leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-4xl lg:text-[3.25rem]',
                    light ? 'text-primary-foreground' : 'text-foreground',
                )}
            >
                {title}
            </h2>
            {description && (
                <p
                    className={cn(
                        'mt-5 max-w-xl text-sm leading-7 sm:text-base',
                        light
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground',
                    )}
                >
                    {description}
                </p>
            )}
        </div>
    );
}

export function LandingHero({
    primaryHref,
    primaryLabel,
}: {
    primaryHref: string | RouteDefinition<'get'>;
    primaryLabel: string;
}) {
    return (
        <section
            aria-labelledby="landing-hero-heading"
            className="landing-hero relative overflow-hidden border-b border-border bg-background"
        >
            <div aria-hidden="true" className="landing-grid absolute inset-0" />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-cover bg-left opacity-25 mix-blend-multiply lg:block dark:opacity-15 dark:mix-blend-screen"
                style={{
                    backgroundImage: `url(${landingAssets.heroBackground})`,
                }}
            />
            <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8 lg:px-8 lg:py-24">
                <ScrollReveal className="relative z-10 max-w-xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.16em] text-brand uppercase">
                        <span className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
                        Field operations, connected
                    </div>
                    <h1
                        id="landing-hero-heading"
                        className="mt-6 text-5xl leading-[0.98] font-extrabold tracking-[-0.065em] sm:text-6xl lg:text-[5.3rem]"
                    >
                        One connected
                        <br />
                        system for every
                        <br />
                        job in the <span className="text-brand">field.</span>
                    </h1>
                    <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                        FieldOps connects the office and the field so teams can
                        assign work, keep moving offline, capture what happened,
                        and bring every update back into one clear operating
                        picture.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href={primaryHref}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl motion-reduce:transition-none dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90"
                        >
                            {primaryLabel}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                        <a
                            href="#workflow"
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-6 text-sm font-extrabold text-foreground transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-brand hover:bg-brand/5 motion-reduce:transition-none"
                        >
                            See the workflow
                            <ArrowDownRight
                                className="size-4 text-brand"
                                aria-hidden="true"
                            />
                        </a>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border/80 pt-5 text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                        <span className="inline-flex items-center gap-2">
                            <CheckCircle2
                                className="size-3.5 text-success"
                                aria-hidden="true"
                            />
                            Works online
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <CloudOff
                                className="size-3.5 text-info"
                                aria-hidden="true"
                            />
                            Keeps working offline
                        </span>
                    </div>
                </ScrollReveal>

                <ScrollReveal
                    direction="right"
                    delay={100}
                    className="relative min-w-0"
                >
                    <div className="landing-hero-orbit absolute -inset-5 rounded-[2rem] border border-brand/10 bg-brand/[0.03] sm:-inset-8" />
                    <div className="relative z-10">
                        <div className="absolute top-1 left-1 z-20 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-2 text-[10px] font-extrabold text-foreground shadow-lg backdrop-blur">
                            <span className="size-2 rounded-full bg-success" />
                            Live operations view
                        </div>
                        <img
                            src={landingAssets.heroDashboard}
                            alt="FieldOps operations dashboard on a laptop beside a work-order phone"
                            className="w-full object-contain drop-shadow-2xl"
                            width="1536"
                            height="1024"
                        />
                        <div className="absolute right-0 bottom-1 flex items-center gap-3 rounded-xl border border-border bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur sm:right-3 sm:bottom-4">
                            <span className="flex size-8 items-center justify-center rounded-full bg-info/10 text-info">
                                <RefreshCw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </span>
                            <span>
                                <span className="block text-[10px] font-extrabold">
                                    Sync queue clear
                                </span>
                                <span className="mt-0.5 block font-mono text-[9px] text-muted-foreground">
                                    last update 09:41:12
                                </span>
                            </span>
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

export function LandingChallenge() {
    const challenges = [
        {
            label: 'Scattered assignments',
            detail: 'Work lives in inboxes, calls, and spreadsheets.',
            icon: Send,
        },
        {
            label: 'Dead zones',
            detail: 'The signal disappears before the job is done.',
            icon: WifiOff,
        },
        {
            label: 'Missing evidence',
            detail: 'Notes and photos arrive late or out of context.',
            icon: Paperclip,
        },
        {
            label: 'Status chasing',
            detail: 'Leaders spend the day asking what is moving.',
            icon: Timer,
        },
    ];

    return (
        <section
            id="platform"
            aria-labelledby="challenge-heading"
            className="scroll-mt-20 border-b border-border bg-card"
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <ScrollReveal className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end lg:gap-20">
                    <SectionHeading
                        id="challenge-heading"
                        eyebrow="The reality on the ground"
                        title="Field work is complex. Your operating picture shouldn’t be."
                        description="When the handoff between the office and the field gets fuzzy, small gaps become missed context, delayed decisions, and work that has to be explained twice."
                    />
                    <div className="relative grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
                        {challenges.map(
                            ({ label, detail, icon: Icon }, index) => (
                                <article
                                    key={label}
                                    className="group bg-background p-5 transition-colors hover:bg-brand/[0.03] sm:p-6"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                                            <Icon
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span className="font-mono text-[10px] text-muted-foreground">
                                            0{index + 1}
                                        </span>
                                    </div>
                                    <h3 className="mt-8 text-sm font-extrabold tracking-tight">
                                        {label}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        {detail}
                                    </p>
                                </article>
                            ),
                        )}
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

function WorkflowCard({
    step,
    index,
}: {
    step: LandingWorkflowStep;
    index: number;
}) {
    const Icon = step.icon;

    return (
        <article className="relative min-w-0 bg-background p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
                <span
                    className={cn(
                        'flex size-10 items-center justify-center rounded-xl border',
                        toneClasses[step.tone],
                    )}
                >
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                    {step.label}
                </span>
            </div>
            <h3 className="mt-6 text-base leading-tight font-extrabold tracking-tight">
                {step.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {step.description}
            </p>
            {index < landingWorkflowSteps.length - 1 && (
                <ChevronRight
                    className="absolute top-9 -right-3 z-10 hidden size-5 rounded-full bg-card text-brand md:block"
                    aria-hidden="true"
                />
            )}
        </article>
    );
}

export function LandingWorkflow() {
    return (
        <section
            id="workflow"
            aria-labelledby="workflow-heading"
            className="scroll-mt-20 border-b border-border bg-background"
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <ScrollReveal className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <SectionHeading
                        id="workflow-heading"
                        eyebrow="One connected operating rhythm"
                        title="Every update has somewhere to go."
                        description="FieldOps keeps the next step visible across the full journey, so work can move forward even when the network cannot."
                    />
                    <div className="flex items-center gap-2 pb-1 font-mono text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                        <span className="size-2 rounded-full bg-success" />
                        <span>route active</span>
                    </div>
                </ScrollReveal>
                <ScrollReveal
                    className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                    delay={80}
                >
                    <div
                        aria-hidden="true"
                        className="landing-route-line absolute top-0 bottom-0 left-1/2 hidden w-px -translate-x-1/2 md:block"
                    />
                    <div className="relative grid gap-px bg-border md:grid-cols-3">
                        {landingWorkflowSteps.map((step, index) => (
                            <WorkflowCard
                                key={step.id}
                                step={step}
                                index={index}
                            />
                        ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-border bg-muted/25 px-5 py-3 font-mono text-[10px] text-muted-foreground sm:px-6">
                        <span>FIELDOPS / WORKFLOW</span>
                        <span className="inline-flex items-center gap-2 text-success">
                            <CircleDot className="size-3" aria-hidden="true" />{' '}
                            06 checkpoints connected
                        </span>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

function CapabilityCard({
    capability,
    index,
}: {
    capability: LandingCapability;
    index: number;
}) {
    const Icon = capability.icon;

    return (
        <article className="group flex min-h-64 flex-col border-t border-border pt-5 transition-colors hover:border-brand">
            <div className="flex items-center justify-between gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none">
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                    CAP / 0{index + 1}
                </span>
            </div>
            <h3 className="mt-7 text-base font-extrabold tracking-tight">
                {capability.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-foreground/85">
                {capability.description}
            </p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
                {capability.detail}
            </p>
        </article>
    );
}

export function LandingCapabilities() {
    return (
        <section
            aria-labelledby="capabilities-heading"
            className="border-b border-border bg-card"
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <ScrollReveal className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
                    <SectionHeading
                        id="capabilities-heading"
                        eyebrow="The shared foundation"
                        title="Built for the details that make field work real."
                        description="From the first assignment to the final report, FieldOps keeps the people, place, evidence, and decision connected."
                    />
                    <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
                        {landingCapabilities.map((capability, index) => (
                            <CapabilityCard
                                key={capability.title}
                                capability={capability}
                                index={index}
                            />
                        ))}
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

export function LandingOffline() {
    return (
        <section
            id="offline"
            aria-labelledby="offline-heading"
            className="scroll-mt-20 overflow-hidden border-b border-border bg-primary text-primary-foreground"
        >
            <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-8 lg:py-24">
                <div
                    aria-hidden="true"
                    className="landing-contours pointer-events-none absolute inset-0 opacity-40"
                />
                <ScrollReveal className="relative z-10">
                    <SectionHeading
                        id="offline-heading"
                        eyebrow="Offline by design"
                        title="The signal can drop. The work doesn’t have to."
                        description="FieldOps treats connectivity as a condition to work through, not a reason to stop. Keep the full job close, queue every change, and let the record catch up when you reconnect."
                        light
                    />
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {[
                            {
                                icon: Download,
                                label: 'Assignments cached before departure',
                            },
                            {
                                icon: FileCheck2,
                                label: 'Forms and checklists ready on site',
                            },
                            {
                                icon: Camera,
                                label: 'Photos and notes held in the queue',
                            },
                            {
                                icon: RefreshCw,
                                label: 'Updates sync when service returns',
                            },
                        ].map(({ icon: Icon, label }) => (
                            <div
                                key={label}
                                className="flex items-start gap-3 rounded-xl border border-primary-foreground/15 bg-primary-foreground/[0.07] p-3 text-sm text-primary-foreground/80"
                            >
                                <Icon
                                    className="mt-0.5 size-4 shrink-0 text-primary-foreground"
                                    aria-hidden="true"
                                />
                                {label}
                            </div>
                        ))}
                    </div>
                </ScrollReveal>

                <ScrollReveal
                    direction="right"
                    delay={100}
                    className="relative z-10"
                >
                    <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/[0.07] p-3 shadow-2xl shadow-primary/30 backdrop-blur sm:p-5">
                        <div className="flex items-center justify-between gap-4 border-b border-primary-foreground/15 pb-4">
                            <div className="flex items-center gap-3">
                                <span className="flex size-10 items-center justify-center rounded-xl bg-warning/20 text-warning">
                                    <WifiOff
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div>
                                    <p className="text-sm font-extrabold">
                                        Connection unavailable
                                    </p>
                                    <p className="mt-1 font-mono text-[10px] text-primary-foreground/60">
                                        FIELD MODE / 09:41:12
                                    </p>
                                </div>
                            </div>
                            <span className="rounded-full bg-warning/20 px-2.5 py-1 text-[10px] font-bold text-warning">
                                3 queued
                            </span>
                        </div>
                        <div className="mt-4 grid gap-2">
                            {[
                                {
                                    label: 'Valve inspection',
                                    detail: 'WO-0056-0128',
                                    icon: Check,
                                },
                                {
                                    label: 'Site photo attached',
                                    detail: 'evidence_0042.jpg',
                                    icon: Camera,
                                },
                                {
                                    label: 'Checklist updated',
                                    detail: 'pump_station_a',
                                    icon: FileCheck2,
                                },
                            ].map(({ label, detail, icon: Icon }, index) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-3 rounded-xl border border-primary-foreground/10 bg-background/10 px-3 py-3"
                                >
                                    <span className="flex size-8 items-center justify-center rounded-lg bg-success/15 text-success">
                                        <Icon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-extrabold">
                                            {label}
                                        </p>
                                        <p className="mt-1 truncate font-mono text-[10px] text-primary-foreground/55">
                                            {detail}
                                        </p>
                                    </div>
                                    <span className="font-mono text-[10px] text-primary-foreground/45">
                                        +{index + 1}m
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-3 rounded-xl bg-success/15 px-3 py-3 text-xs text-primary-foreground/85">
                            <Signal
                                className="size-4 text-success"
                                aria-hidden="true"
                            />
                            <span className="flex-1">
                                Ready to sync when you’re back online.
                            </span>
                            <span className="font-mono text-[10px] text-success">
                                100%
                            </span>
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

function MapPin({ job }: { job: LandingMapJob }) {
    return (
        <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: job.top, left: job.left }}
        >
            <span
                className={cn(
                    'flex size-7 items-center justify-center rounded-full border-2 border-background shadow-lg',
                    job.priority === 'High'
                        ? 'bg-destructive text-destructive-foreground'
                        : job.priority === 'Medium'
                          ? 'bg-warning text-warning-foreground'
                          : 'bg-success text-success-foreground',
                )}
            >
                <MapPinned className="size-3.5" aria-hidden="true" />
            </span>
            <span className="absolute top-8 left-1/2 hidden -translate-x-1/2 rounded-md border border-border bg-card px-2 py-1 text-[9px] font-bold whitespace-nowrap text-foreground shadow-lg md:block">
                {job.id}
            </span>
        </div>
    );
}

export function LandingMapping() {
    return (
        <section
            id="mapping"
            aria-labelledby="mapping-heading"
            className="scroll-mt-20 border-b border-border bg-background"
        >
            <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20 lg:px-8 lg:py-24">
                <ScrollReveal direction="left" className="relative min-w-0">
                    <div className="landing-map relative aspect-[1.15/0.82] overflow-hidden rounded-2xl border border-border bg-muted/30 shadow-xl">
                        <div
                            className="absolute inset-0 opacity-50"
                            aria-hidden="true"
                        >
                            <div className="absolute top-[18%] left-[-5%] h-px w-[110%] rotate-[12deg] bg-brand/20" />
                            <div className="absolute top-[48%] left-[-5%] h-px w-[110%] -rotate-[17deg] bg-info/20" />
                            <div className="absolute top-[74%] left-[-5%] h-px w-[110%] rotate-[8deg] bg-success/20" />
                            <div className="absolute top-[-5%] left-[34%] h-[110%] w-px rotate-[19deg] bg-brand/15" />
                            <div className="absolute top-[-5%] left-[68%] h-[110%] w-px -rotate-[24deg] bg-info/15" />
                        </div>
                        <div className="absolute top-[23%] left-[14%] h-24 w-44 rounded-[50%] border border-success/20 bg-success/5" />
                        <div className="absolute right-[6%] bottom-[13%] h-32 w-44 rounded-[50%] border border-info/20 bg-info/5" />
                        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-card/90 px-3 py-2 shadow-sm backdrop-blur sm:inset-x-5 sm:top-5">
                            <div className="flex items-center gap-2">
                                <MapPinned
                                    className="size-4 text-brand"
                                    aria-hidden="true"
                                />
                                <span className="text-xs font-extrabold">
                                    Active work map
                                </span>
                            </div>
                            <span className="flex items-center gap-1.5 font-mono text-[10px] text-success">
                                <span className="size-1.5 rounded-full bg-success" />{' '}
                                12 crews online
                            </span>
                        </div>
                        <div className="absolute right-5 bottom-5 flex flex-col gap-2 rounded-xl border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur">
                            <button
                                type="button"
                                aria-label="Zoom in"
                                className="flex size-7 items-center justify-center rounded-lg text-sm font-bold hover:bg-muted"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                aria-label="Zoom out"
                                className="flex size-7 items-center justify-center rounded-lg text-sm font-bold hover:bg-muted"
                            >
                                −
                            </button>
                        </div>
                        {landingMapJobs.map((job) => (
                            <MapPin key={job.id} job={job} />
                        ))}
                        <div className="absolute bottom-[16%] left-[18%] flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1.5 text-[9px] font-bold text-brand shadow-sm">
                            <Navigation className="size-3" aria-hidden="true" />{' '}
                            Crew 04 / en route
                        </div>
                    </div>
                </ScrollReveal>

                <ScrollReveal direction="right" delay={100}>
                    <SectionHeading
                        id="mapping-heading"
                        eyebrow="Location-aware coordination"
                        title="Put the work on the map, then make the next move obvious."
                        description="A geographic view gives supervisors the context to group nearby work, spot priority issues, and send the right crew with the right information."
                    />
                    <div className="mt-8 divide-y divide-border border-y border-border">
                        {landingMapJobs.map((job) => (
                            <article
                                key={job.id}
                                className="flex items-center gap-3 py-4"
                            >
                                <span
                                    className={cn(
                                        'size-2 shrink-0 rounded-full',
                                        job.priority === 'High'
                                            ? 'bg-destructive'
                                            : job.priority === 'Medium'
                                              ? 'bg-warning'
                                              : 'bg-success',
                                    )}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-extrabold">
                                            {job.title}
                                        </p>
                                        <span
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-[9px] font-bold',
                                                statusClasses[job.status],
                                            )}
                                        >
                                            {job.status}
                                        </span>
                                    </div>
                                    <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                                        {job.id} · {job.location}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'hidden text-[10px] font-extrabold sm:block',
                                        priorityClasses[job.priority],
                                    )}
                                >
                                    {job.priority}
                                </span>
                            </article>
                        ))}
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

export function LandingReporting() {
    return (
        <section
            id="reporting"
            aria-labelledby="reporting-heading"
            className="scroll-mt-20 border-b border-border bg-card"
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <ScrollReveal className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
                    <div>
                        <SectionHeading
                            id="reporting-heading"
                            eyebrow="From field notes to confidence"
                            title="See what moved. Know what needs you next."
                            description="Structured updates make the daily operating picture easier to read—and the next decision easier to make."
                        />
                        <div className="mt-8 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
                                <CheckCircle2
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <p className="text-sm font-extrabold">
                                Every completion has a record behind it.
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        {landingMetrics.map((metric, index) => (
                            <article
                                key={metric.label}
                                className="rounded-2xl border border-border bg-background p-5 shadow-sm transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md motion-reduce:transition-none"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        METRIC / 0{index + 1}
                                    </span>
                                    <MoreHorizontal
                                        className="size-4 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                </div>
                                <p className="mt-8 text-4xl font-extrabold tracking-[-0.06em]">
                                    {metric.value}
                                </p>
                                <p className="mt-1 text-sm font-bold">
                                    {metric.label}
                                </p>
                                <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-success">
                                    <ArrowRight
                                        className="size-3 -rotate-45"
                                        aria-hidden="true"
                                    />{' '}
                                    {metric.trend}
                                </p>
                            </article>
                        ))}
                    </div>
                </ScrollReveal>

                <ScrollReveal
                    className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"
                    delay={100}
                >
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-5 sm:p-7">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-brand uppercase">
                                    Completion evidence
                                </p>
                                <h3 className="mt-2 text-lg font-extrabold">
                                    Main St. Pump Station
                                </h3>
                            </div>
                            <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
                                Complete
                            </span>
                        </div>
                        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.2fr]">
                            <img
                                src={landingAssets.fieldWorkerTablet}
                                alt="Field worker reviewing a work order on a tablet beside a city waterway"
                                className="h-full min-h-44 w-full rounded-xl object-cover"
                                width="1440"
                                height="1152"
                                loading="lazy"
                            />
                            <div className="grid gap-2">
                                {[
                                    {
                                        icon: Check,
                                        label: 'Inspection checklist',
                                        detail: '12 / 12 complete',
                                    },
                                    {
                                        icon: Camera,
                                        label: 'Photo evidence',
                                        detail: '4 attachments',
                                    },
                                    {
                                        icon: MapPinned,
                                        label: 'Location verified',
                                        detail: '34.0522° N, 118.2437° W',
                                    },
                                ].map(({ icon: Icon, label, detail }) => (
                                    <div
                                        key={label}
                                        className="flex items-center gap-3 rounded-xl border border-border px-3 py-3"
                                    >
                                        <span className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                                            <Icon
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-extrabold">
                                                {label}
                                            </p>
                                            <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                                                {detail}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-primary p-5 text-primary-foreground sm:p-7">
                        <div className="flex items-center justify-between gap-4">
                            <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-primary-foreground/75 uppercase">
                                Team pulse
                            </p>
                            <span className="flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-2.5 py-1 text-[10px] font-bold">
                                <span className="size-1.5 rounded-full bg-success" />{' '}
                                Live
                            </span>
                        </div>
                        <div className="mt-10 flex items-end gap-2">
                            {[
                                32, 46, 38, 60, 54, 72, 66, 84, 78, 92, 86, 100,
                            ].map((height, index) => (
                                <span
                                    key={index}
                                    className={cn(
                                        'flex-1 rounded-t-sm',
                                        index > 8
                                            ? 'bg-primary-foreground'
                                            : 'bg-primary-foreground/25',
                                    )}
                                    style={{ height: `${height}px` }}
                                />
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-primary-foreground/15 pt-4 text-[10px] text-primary-foreground/75">
                            <span>Mon</span>
                            <span>Today</span>
                        </div>
                        <div className="mt-8 flex items-start gap-3 rounded-xl bg-primary-foreground/[0.08] p-3">
                            <UsersRoundIcon />
                            <p className="text-xs leading-5 text-primary-foreground/80">
                                The office sees the same progress the crew is
                                creating in the field.
                            </p>
                        </div>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

function UsersRoundIcon() {
    return (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground">
            <Smartphone className="size-4" aria-hidden="true" />
        </span>
    );
}

export function LandingCta({
    primaryHref,
    primaryLabel,
}: {
    primaryHref: string | RouteDefinition<'get'>;
    primaryLabel: string;
}) {
    return (
        <section
            id="start"
            aria-labelledby="cta-heading"
            className="scroll-mt-20 overflow-hidden bg-primary text-primary-foreground"
        >
            <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full border border-brand-foreground/10"
                />
                <ScrollReveal direction="left" className="relative z-10">
                    <img
                        src={landingAssets.ctaMobileCard}
                        alt="FieldOps mobile work order screen and completed work card"
                        className="mx-auto w-full max-w-sm object-contain drop-shadow-2xl lg:mx-0"
                        width="1536"
                        height="1024"
                        loading="lazy"
                    />
                </ScrollReveal>
                <ScrollReveal
                    direction="right"
                    delay={100}
                    className="relative z-10"
                >
                    <SectionKicker className="text-primary-foreground/75">
                        Make the next move clearer
                    </SectionKicker>
                    <h2
                        id="cta-heading"
                        className="mt-4 max-w-xl text-4xl leading-[1.02] font-extrabold tracking-[-0.055em] sm:text-5xl"
                    >
                        Keep your people moving and your operation in sync.
                    </h2>
                    <p className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/80">
                        Start with the workflow that matters most, then connect
                        the context that helps your team do it better.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                            href={primaryHref}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-foreground px-6 text-sm font-extrabold text-primary transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-foreground/90 motion-reduce:transition-none"
                        >
                            {primaryLabel}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                        <a
                            href="#workflow"
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-primary-foreground/45 px-6 text-sm font-extrabold text-primary-foreground transition-colors hover:bg-primary-foreground/10 motion-reduce:transition-none"
                        >
                            Back to the workflow
                        </a>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}
