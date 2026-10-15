import { Link } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Camera,
    Check,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    CloudOff,
    MapPin,
    MapPinned,
    RefreshCw,
    Send,
    Signal,
    Smartphone,
    Timer,
    WifiOff,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { ScrollReveal } from '@/components/scroll-reveal';
import { cn } from '@/lib/utils';
import type { RouteDefinition } from '@/wayfinder';
import {
    landingAssets,
    landingFaqs,
    landingOutcomes,
    landingTourSteps,
    landingWorkflowSteps,
} from '../data';

type LandingActionProps = {
    primaryHref: string | RouteDefinition<'get'>;
    primaryLabel: string;
};

function SectionHeading({
    eyebrow,
    title,
    description,
    id,
    inverse = false,
}: {
    eyebrow: string;
    title: string;
    description: string;
    id: string;
    inverse?: boolean;
}) {
    return (
        <div className="max-w-2xl">
            <p
                className={cn(
                    'text-[11px] font-extrabold tracking-[0.16em] uppercase',
                    inverse ? 'text-primary-foreground/70' : 'text-brand',
                )}
            >
                {eyebrow}
            </p>
            <h2
                id={id}
                className={cn(
                    'mt-4 text-3xl leading-[1.05] font-extrabold tracking-[-0.045em] sm:text-4xl lg:text-5xl',
                    inverse ? 'text-primary-foreground' : 'text-foreground',
                )}
            >
                {title}
            </h2>
            <p
                className={cn(
                    'mt-5 max-w-xl text-sm leading-7 sm:text-base',
                    inverse
                        ? 'text-primary-foreground/75'
                        : 'text-muted-foreground',
                )}
            >
                {description}
            </p>
        </div>
    );
}

export function LandingHero({ primaryHref, primaryLabel }: LandingActionProps) {
    return (
        <section
            id="top"
            aria-labelledby="landing-hero-heading"
            className="landing-hero relative scroll-mt-20 overflow-hidden border-b border-border bg-background"
        >
            <div aria-hidden="true" className="landing-grid absolute inset-0" />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-cover bg-center opacity-20 mix-blend-multiply sm:h-[52%] dark:opacity-10 dark:mix-blend-screen"
                style={{
                    backgroundImage: `url(${landingAssets.heroBackground})`,
                }}
            />
            <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-5 pt-14 pb-10 text-center sm:px-6 sm:pt-20 sm:pb-14 lg:px-8 lg:pt-24 lg:pb-16">
                <ScrollReveal className="relative z-10 flex max-w-4xl flex-col items-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.15em] text-brand uppercase">
                        <span className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
                        Built for operations in motion
                    </div>
                    <h1
                        id="landing-hero-heading"
                        className="mt-7 max-w-4xl text-5xl leading-[0.98] font-extrabold tracking-[-0.065em] sm:text-6xl lg:text-[6.25rem]"
                    >
                        Keep every field job moving.
                        <span className="block text-brand">
                            From one clear view.
                        </span>
                    </h1>
                    <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                        FieldOps gives operations leaders one place to dispatch
                        work, support crews offline, verify completion, and see
                        what needs attention next.
                    </p>

                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <a
                            href="#tour"
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition-[transform,background-color,box-shadow] hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl motion-reduce:transition-none dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand/90"
                        >
                            Explore the platform
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </a>
                        <Link
                            href={primaryHref}
                            className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-background/80 px-6 text-sm font-extrabold text-foreground transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-brand hover:bg-brand/5 motion-reduce:transition-none"
                        >
                            {primaryLabel}
                        </Link>
                    </div>

                    <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-border/80 pt-5 text-[10px] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                        <span className="inline-flex items-center gap-2">
                            <CheckCircle2
                                className="size-3.5 text-success"
                                aria-hidden="true"
                            />
                            Office and field connected
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <CloudOff
                                className="size-3.5 text-info"
                                aria-hidden="true"
                            />
                            Offline-capable workflow
                        </span>
                    </div>
                </ScrollReveal>

                <ScrollReveal
                    delay={100}
                    className="relative z-10 mt-14 w-full max-w-6xl sm:mt-16 lg:mt-20"
                >
                    <div className="landing-hero-orbit pointer-events-none absolute -inset-3 rounded-[2rem] border border-brand/10 bg-brand/[0.03] sm:-inset-6" />
                    <div className="relative overflow-hidden rounded-[1.5rem] border border-border/80 bg-card/90 p-2 text-left shadow-2xl shadow-primary/15 backdrop-blur sm:rounded-[2rem] sm:p-3">
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
                            <span className="size-2 rounded-full bg-destructive/70" />
                            <span className="size-2 rounded-full bg-warning/70" />
                            <span className="size-2 rounded-full bg-success/70" />
                            <span className="ml-2 truncate font-mono text-[9px] font-bold text-muted-foreground sm:text-[10px]">
                                fieldops.app / dashboard
                            </span>
                            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[9px] font-bold text-success sm:text-[10px]">
                                <span className="size-1.5 rounded-full bg-success" />
                                Live view
                            </span>
                        </div>
                        <div className="relative overflow-hidden rounded-[1rem] bg-background sm:rounded-[1.5rem]">
                            <img
                                src={landingAssets.heroDashboard}
                                alt="FieldOps operations dashboard on a laptop beside a work-order phone"
                                className="w-full object-contain drop-shadow-2xl"
                                width="1536"
                                height="1024"
                            />
                        </div>
                    </div>
                    <div className="relative mx-auto -mt-3 flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-extrabold text-foreground shadow-lg sm:-mt-4 sm:px-4 sm:py-2.5">
                        <RefreshCw
                            className="size-3.5 text-brand"
                            aria-hidden="true"
                        />
                        One shared operating record
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

export function LandingChallenge() {
    const problems = [
        {
            icon: Send,
            title: 'Assignments scatter',
            text: 'Work starts in calls, inboxes, and spreadsheets.',
        },
        {
            icon: WifiOff,
            title: 'Coverage disappears',
            text: 'The signal drops before the job is finished.',
        },
        {
            icon: Camera,
            title: 'Evidence arrives late',
            text: 'Notes and photos lose their job context.',
        },
        {
            icon: Timer,
            title: 'Leaders chase status',
            text: 'Progress has to be reconstructed by hand.',
        },
    ];

    return (
        <section
            aria-labelledby="challenge-heading"
            className="border-b border-border bg-card"
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <ScrollReveal className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:gap-16">
                    <SectionHeading
                        id="challenge-heading"
                        eyebrow="The operational gap"
                        title="The work is already hard. The handoffs should not be."
                        description="FieldOps creates one continuous record from the first assignment to the final review, so the office and the field can move from the same facts."
                    />
                    <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
                        {problems.map(({ icon: Icon, title, text }, index) => (
                            <article key={title} className="bg-background p-6">
                                <div className="flex items-center justify-between">
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                        <Icon
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        0{index + 1}
                                    </span>
                                </div>
                                <h3 className="mt-7 text-base font-extrabold">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    {text}
                                </p>
                            </article>
                        ))}
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

function DispatchPreview() {
    return (
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {[
                    ['24', 'Active assignments'],
                    ['06', 'Ready to dispatch'],
                    ['03', 'Need attention'],
                ].map(([value, label], index) => (
                    <div
                        key={label}
                        className="rounded-xl border border-border bg-card p-4"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-extrabold">{value}</p>
                            <span
                                className={cn(
                                    'size-2 rounded-full',
                                    index === 2 ? 'bg-warning' : 'bg-success',
                                )}
                            />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold">Dispatch queue</p>
                    <span className="text-[10px] font-bold text-brand">
                        Priority first
                    </span>
                </div>
                <div className="mt-4 grid gap-2">
                    {[
                        ['North district sweep', 'Maya Santos', 'In progress'],
                        ['Pump station inspection', 'Unassigned', 'Ready'],
                        ['Warehouse audit', 'Jon Bell', 'Needs review'],
                    ].map(([job, owner, status]) => (
                        <div
                            key={job}
                            className="flex items-center gap-3 rounded-xl border border-border p-3"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                                <ClipboardCheck
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-extrabold">
                                    {job}
                                </p>
                                <p className="mt-1 truncate text-[10px] text-muted-foreground">
                                    {owner}
                                </p>
                            </div>
                            <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-bold text-muted-foreground">
                                {status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FieldPreview() {
    return (
        <div className="mx-auto max-w-sm rounded-[2rem] border-[6px] border-primary bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                    <p className="text-[10px] font-bold text-brand">
                        WO-0056-0128
                    </p>
                    <p className="text-sm font-extrabold">Valve inspection</p>
                </div>
                <span className="rounded-full bg-info/10 px-2 py-1 text-[9px] font-bold text-info">
                    In progress
                </span>
            </div>
            <div className="mt-4 rounded-xl bg-muted p-3">
                <p className="text-[10px] text-muted-foreground">LOCATION</p>
                <p className="mt-1 text-xs font-bold">Main St. Pump Station</p>
            </div>
            <div className="mt-4 grid gap-2">
                {[
                    'Confirm isolation',
                    'Inspect valve body',
                    'Capture completion photo',
                ].map((item, index) => (
                    <div
                        key={item}
                        className="flex items-center gap-3 rounded-xl border border-border p-3"
                    >
                        <span
                            className={cn(
                                'flex size-6 items-center justify-center rounded-full border',
                                index < 2
                                    ? 'border-success bg-success text-success-foreground'
                                    : 'border-border text-muted-foreground',
                            )}
                        >
                            {index < 2 ? (
                                <Check className="size-3" aria-hidden="true" />
                            ) : (
                                index + 1
                            )}
                        </span>
                        <p className="text-xs font-bold">{item}</p>
                    </div>
                ))}
            </div>
            <button
                type="button"
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-xs font-extrabold text-primary-foreground"
            >
                <Camera className="size-4" aria-hidden="true" /> Add evidence
            </button>
        </div>
    );
}

function MapPreview() {
    const pins = [
        ['top-[24%] left-[65%]', 'bg-destructive'],
        ['top-[48%] left-[30%]', 'bg-warning'],
        ['top-[67%] left-[72%]', 'bg-success'],
    ];

    return (
        <div className="relative min-h-96 overflow-hidden rounded-xl border border-border bg-muted">
            <div
                aria-hidden="true"
                className="absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:46px_46px] opacity-60"
            />
            <div className="absolute inset-x-4 top-4 flex items-center justify-between rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
                <span className="inline-flex items-center gap-2 text-xs font-extrabold">
                    <MapPinned
                        className="size-4 text-brand"
                        aria-hidden="true"
                    />{' '}
                    Active work map
                </span>
                <span className="inline-flex items-center gap-2 text-[10px] font-bold text-success">
                    <Signal className="size-3" aria-hidden="true" /> 12 crews
                    online
                </span>
            </div>
            {pins.map(([position, tone], index) => (
                <span
                    key={position}
                    className={cn(
                        'absolute flex size-10 items-center justify-center rounded-full border-4 border-card text-primary-foreground shadow-lg',
                        position,
                        tone,
                    )}
                >
                    <MapPin
                        className="size-4"
                        aria-label={`Priority work location ${index + 1}`}
                    />
                </span>
            ))}
            <div className="absolute bottom-5 left-5 rounded-xl border border-brand/20 bg-card/95 p-3 shadow-lg">
                <p className="text-[10px] font-bold text-brand">
                    CREW 04 · EN ROUTE
                </p>
                <p className="mt-1 text-xs font-extrabold">
                    3 nearby assignments
                </p>
            </div>
        </div>
    );
}

function ReportingPreview() {
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            {[
                ['86%', 'Team capacity', 'On track'],
                ['73', 'Completed today', 'Reviewed'],
                ['18', 'Need attention', 'Prioritized'],
            ].map(([value, label, status], index) => (
                <article
                    key={label}
                    className="rounded-xl border border-border bg-card p-5"
                >
                    <div className="flex items-center justify-between">
                        <BarChart3
                            className="size-4 text-brand"
                            aria-hidden="true"
                        />
                        <span className="text-[9px] font-bold text-success">
                            {status}
                        </span>
                    </div>
                    <p className="mt-8 text-3xl font-extrabold tracking-tight">
                        {value}
                    </p>
                    <p className="mt-1 text-xs font-bold">{label}</p>
                    <div
                        className="mt-5 flex h-16 items-end gap-1"
                        aria-hidden="true"
                    >
                        {[35, 48, 42, 65, 56, 78, 70, 88].map(
                            (height, barIndex) => (
                                <span
                                    key={barIndex}
                                    className={cn(
                                        'flex-1 rounded-t-sm',
                                        index === 2 && barIndex > 5
                                            ? 'bg-warning'
                                            : 'bg-brand/60',
                                    )}
                                    style={{ height: `${height}%` }}
                                />
                            ),
                        )}
                    </div>
                </article>
            ))}
        </div>
    );
}

function ProductPreview({ activeId }: { activeId: string }) {
    return (
        <div className="rounded-2xl border border-border bg-background p-3 shadow-2xl shadow-primary/10 sm:p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
                <span className="size-2 rounded-full bg-destructive/70" />
                <span className="size-2 rounded-full bg-warning/70" />
                <span className="size-2 rounded-full bg-success/70" />
                <span className="ml-auto text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                    FieldOps workspace
                </span>
            </div>
            {activeId === 'dispatch' && <DispatchPreview />}
            {activeId === 'field' && <FieldPreview />}
            {activeId === 'map' && <MapPreview />}
            {activeId === 'reporting' && <ReportingPreview />}
        </div>
    );
}

export function LandingTour() {
    const [activeId, setActiveId] = useState(landingTourSteps[0].id);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const activeStep =
        landingTourSteps.find((step) => step.id === activeId) ??
        landingTourSteps[0];
    const ActiveIcon = activeStep.icon;

    const selectTab = (index: number) => {
        const nextIndex =
            (index + landingTourSteps.length) % landingTourSteps.length;
        setActiveId(landingTourSteps[nextIndex].id);
        tabRefs.current[nextIndex]?.focus();
    };

    return (
        <section
            id="tour"
            aria-labelledby="tour-heading"
            className="scroll-mt-20 border-b border-border bg-background"
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <ScrollReveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <SectionHeading
                        id="tour-heading"
                        eyebrow="Guided product tour"
                        title="Follow the work from request to result."
                        description="Explore the connected views that help an operations leader plan the day, support the crew, and respond to what changes."
                    />
                    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-bold text-muted-foreground">
                        <span className="size-2 rounded-full bg-success" />{' '}
                        Illustrative product preview
                    </div>
                </ScrollReveal>

                <ScrollReveal className="mt-10" delay={100}>
                    <div
                        role="tablist"
                        aria-label="FieldOps product tour"
                        className="grid gap-2 rounded-2xl border border-border bg-card p-2 sm:grid-cols-4"
                    >
                        {landingTourSteps.map((step, index) => {
                            const Icon = step.icon;
                            const selected = step.id === activeId;

                            return (
                                <button
                                    key={step.id}
                                    ref={(element) => {
                                        tabRefs.current[index] = element;
                                    }}
                                    id={`tour-tab-${step.id}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    aria-controls="tour-panel"
                                    tabIndex={selected ? 0 : -1}
                                    className={cn(
                                        'flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-xs font-extrabold transition-colors motion-reduce:transition-none',
                                        selected
                                            ? 'bg-primary text-primary-foreground dark:bg-brand dark:text-brand-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                    onClick={() => setActiveId(step.id)}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'ArrowRight' ||
                                            event.key === 'ArrowDown'
                                        ) {
                                            event.preventDefault();
                                            selectTab(index + 1);
                                        }

                                        if (
                                            event.key === 'ArrowLeft' ||
                                            event.key === 'ArrowUp'
                                        ) {
                                            event.preventDefault();
                                            selectTab(index - 1);
                                        }

                                        if (event.key === 'Home') {
                                            event.preventDefault();
                                            selectTab(0);
                                        }

                                        if (event.key === 'End') {
                                            event.preventDefault();
                                            selectTab(
                                                landingTourSteps.length - 1,
                                            );
                                        }
                                    }}
                                >
                                    <Icon
                                        className="size-4"
                                        aria-hidden="true"
                                    />{' '}
                                    {step.label}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        id="tour-panel"
                        role="tabpanel"
                        aria-labelledby={`tour-tab-${activeStep.id}`}
                        className="mt-5 grid gap-8 rounded-3xl border border-border bg-card p-5 sm:p-7 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:p-8"
                    >
                        <div>
                            <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                <ActiveIcon
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <p className="mt-7 text-[10px] font-extrabold tracking-[0.16em] text-brand uppercase">
                                {activeStep.eyebrow}
                            </p>
                            <h3 className="mt-3 text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
                                {activeStep.title}
                            </h3>
                            <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                {activeStep.description}
                            </p>
                            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-border pt-5">
                                <div>
                                    <p className="text-xl font-extrabold">
                                        {activeStep.metric}
                                    </p>
                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                        {activeStep.metricLabel}
                                    </p>
                                </div>
                                <div>
                                    <p className="inline-flex items-center gap-2 text-xs font-bold text-success">
                                        <span className="size-2 rounded-full bg-success" />{' '}
                                        Live state
                                    </p>
                                    <p className="mt-2 text-[10px] text-muted-foreground">
                                        {activeStep.status}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <ProductPreview activeId={activeStep.id} />
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

export function LandingWorkflow() {
    return (
        <section
            id="workflow"
            aria-labelledby="workflow-heading"
            className="scroll-mt-20 border-b border-border bg-card"
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <ScrollReveal>
                    <SectionHeading
                        id="workflow-heading"
                        eyebrow="One continuous workflow"
                        title="Six steps. One shared operating record."
                        description="Keep every handoff connected so a job can move from the office to the field and back without losing its owner, context, or evidence."
                    />
                </ScrollReveal>
                <ScrollReveal
                    className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3"
                    delay={100}
                >
                    {landingWorkflowSteps.map((step, index) => {
                        const Icon = step.icon;

                        return (
                            <article
                                key={step.id}
                                className="relative bg-background p-6"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                        <Icon
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        {step.label}
                                    </span>
                                </div>
                                <h3 className="mt-6 text-base font-extrabold">
                                    {step.title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    {step.description}
                                </p>
                                {index < landingWorkflowSteps.length - 1 && (
                                    <ChevronRight
                                        className="absolute top-8 -right-3 z-10 hidden size-5 rounded-full bg-card text-brand lg:block"
                                        aria-hidden="true"
                                    />
                                )}
                            </article>
                        );
                    })}
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
            className="scroll-mt-20 overflow-hidden bg-primary text-primary-foreground"
        >
            <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-24">
                <ScrollReveal>
                    <SectionHeading
                        id="offline-heading"
                        eyebrow="Offline-first field work"
                        title="The signal can drop. The work does not have to."
                        description="Give crews the job details they need before they lose coverage, keep updates queued on the device, and reconnect the record when service returns."
                        inverse
                    />
                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                        {[
                            [CloudOff, 'Work remains available'],
                            [Smartphone, 'Updates stay on device'],
                            [RefreshCw, 'Sync resumes on reconnect'],
                        ].map(([Icon, label]) => (
                            <div
                                key={label as string}
                                className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/[0.06] p-4"
                            >
                                <Icon className="size-5" aria-hidden="true" />
                                <p className="mt-3 text-xs font-bold">
                                    {label as string}
                                </p>
                            </div>
                        ))}
                    </div>
                </ScrollReveal>
                <ScrollReveal
                    direction="right"
                    delay={100}
                    className="relative"
                >
                    <img
                        src={landingAssets.fieldWorkerTablet}
                        alt="Field worker reviewing a FieldOps work order on a tablet"
                        className="aspect-[5/4] w-full rounded-3xl object-cover shadow-2xl"
                        width="1440"
                        height="1152"
                        loading="lazy"
                    />
                    <div className="absolute right-4 bottom-4 left-4 rounded-2xl border border-border bg-card/95 p-4 text-card-foreground shadow-xl backdrop-blur sm:right-8 sm:bottom-8 sm:left-auto sm:w-72">
                        <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 text-xs font-extrabold">
                                <CloudOff
                                    className="size-4 text-info"
                                    aria-hidden="true"
                                />{' '}
                                Connection unavailable
                            </span>
                            <span className="size-2 rounded-full bg-warning" />
                        </div>
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full w-3/4 rounded-full bg-brand" />
                        </div>
                        <p className="mt-3 text-[10px] text-muted-foreground">
                            Ready to sync when you’re back online.
                        </p>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
}

export function LandingOutcomes() {
    return (
        <section
            id="outcomes"
            aria-labelledby="outcomes-heading"
            className="scroll-mt-20 border-b border-border bg-background"
        >
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
                <ScrollReveal className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
                    <SectionHeading
                        id="outcomes-heading"
                        eyebrow="A clearer operating picture"
                        title="Know what moved—and what needs you next."
                        description="FieldOps turns daily activity into a shared view of ownership, progress, evidence, and exceptions without adding another layer of status chasing."
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        {landingOutcomes.map(
                            ({ icon: Icon, title, description }) => (
                                <article
                                    key={title}
                                    className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-[transform,border-color] hover:-translate-y-0.5 hover:border-brand/40 motion-reduce:transition-none"
                                >
                                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                        <Icon
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <h3 className="mt-6 text-base font-extrabold">
                                        {title}
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                        {description}
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

export function LandingFaq() {
    return (
        <section
            id="faq"
            aria-labelledby="faq-heading"
            className="scroll-mt-20 border-b border-border bg-card"
        >
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-8 lg:py-24">
                <ScrollReveal>
                    <SectionHeading
                        id="faq-heading"
                        eyebrow="Before you get started"
                        title="Straight answers for an operation in motion."
                        description="A few practical details about how FieldOps supports the office, the field, and the connection between them."
                    />
                </ScrollReveal>
                <ScrollReveal
                    className="divide-y divide-border border-y border-border"
                    delay={100}
                >
                    {landingFaqs.map((faq, index) => (
                        <details
                            key={faq.question}
                            className="group py-1"
                            open={index === 0}
                        >
                            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-2 text-sm font-extrabold focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                                {faq.question}
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-brand transition-transform group-open:rotate-90 motion-reduce:transition-none">
                                    <ChevronRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </span>
                            </summary>
                            <p className="max-w-2xl px-2 pr-12 pb-5 text-sm leading-7 text-muted-foreground">
                                {faq.answer}
                            </p>
                        </details>
                    ))}
                </ScrollReveal>
            </div>
        </section>
    );
}

export function LandingCta({ primaryHref, primaryLabel }: LandingActionProps) {
    return (
        <section
            id="start"
            aria-labelledby="cta-heading"
            className="scroll-mt-20 overflow-hidden bg-primary text-primary-foreground"
        >
            <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
                <ScrollReveal direction="left" className="relative z-10">
                    <img
                        src={landingAssets.ctaMobileCard}
                        alt="FieldOps mobile work-order list with a completed job"
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
                    <p className="text-[11px] font-extrabold tracking-[0.16em] text-primary-foreground/70 uppercase">
                        Make the next move clearer
                    </p>
                    <h2
                        id="cta-heading"
                        className="mt-4 max-w-xl text-4xl leading-[1.02] font-extrabold tracking-[-0.055em] sm:text-5xl"
                    >
                        Bring the office and the field into one operating
                        rhythm.
                    </h2>
                    <p className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/75">
                        Start with the workflow that matters most, then build
                        the shared context your team needs to keep moving.
                    </p>
                    <Link
                        href={primaryHref}
                        className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-foreground px-6 text-sm font-extrabold text-primary transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-primary-foreground/90 motion-reduce:transition-none"
                    >
                        {primaryLabel}
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </ScrollReveal>
            </div>
        </section>
    );
}
