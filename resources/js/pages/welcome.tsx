import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ClipboardCheck,
    MapPinned,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { dashboard, login } from '@/routes';
/* @chisel-registration */
import { register } from '@/routes';
/* @end-chisel-registration */
import { cn } from '@/lib/utils';

const capabilities = [
    {
        icon: MapPinned,
        title: 'See the whole field',
        description:
            'Keep teams, locations, and active work visible in one calm operational view.',
    },
    {
        icon: ClipboardCheck,
        title: 'Turn plans into progress',
        description:
            'Give every assignment a clear owner, status, and next action from the start.',
    },
    {
        icon: ShieldCheck,
        title: 'Operate with confidence',
        description:
            'Build secure workflows with clear permissions and an audit-ready history.',
    },
];

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Field operations, made clear" />
            <div className="min-h-svh overflow-hidden bg-background text-foreground">
                <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
                    <Link
                        href="/"
                        className="flex items-center gap-3 font-semibold tracking-tight"
                    >
                        <span className="flex size-10 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-lg shadow-brand/20">
                            <MapPinned className="size-5" aria-hidden="true" />
                        </span>
                        <span>FieldOps</span>
                    </Link>

                    <nav
                        aria-label="Main navigation"
                        className="flex items-center gap-2 text-sm"
                    >
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                            >
                                Open dashboard
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="inline-flex min-h-10 items-center rounded-full px-4 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                    Log in
                                </Link>
                                {/* @chisel-registration */}
                                <Link
                                    href={register()}
                                    className="inline-flex min-h-10 items-center rounded-full bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                >
                                    Get started
                                </Link>
                                {/* @end-chisel-registration */}
                            </>
                        )}
                    </nav>
                </header>

                <main>
                    <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 pt-12 pb-20 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pt-28">
                        <div className="max-w-2xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand">
                                <span
                                    className="size-2 rounded-full bg-success"
                                    aria-hidden="true"
                                />
                                Built for teams that keep moving
                            </div>
                            <h1 className="max-w-xl text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
                                Make every field day feel{' '}
                                <span className="text-brand">
                                    under control.
                                </span>
                            </h1>
                            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
                                FieldOps brings assignments, people, and
                                progress into one focused workspace so your team
                                can spend less time coordinating and more time
                                delivering.
                            </p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Link
                                    href={auth.user ? dashboard() : login()}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 hover:bg-primary/90"
                                >
                                    Explore the workspace
                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Link>
                                <a
                                    href="#capabilities"
                                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-border px-6 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                                >
                                    See how it works
                                </a>
                            </div>
                        </div>

                        <div className="relative">
                            <div
                                className="absolute -inset-8 rounded-full bg-brand/10 blur-3xl"
                                aria-hidden="true"
                            />
                            <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-2xl shadow-brand/10 sm:p-6">
                                <div className="flex items-center justify-between border-b border-border pb-4">
                                    <div>
                                        <p className="text-sm font-semibold">
                                            Today in the field
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Tuesday, October 14
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                                        Live view
                                    </span>
                                </div>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-brand/10 p-4">
                                        <p className="text-3xl font-semibold text-brand">
                                            24
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Active assignments
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-success/10 p-4">
                                        <p className="text-3xl font-semibold text-success">
                                            86%
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            On track today
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-5 space-y-3">
                                    {[
                                        'North district sweep',
                                        'Warehouse audit',
                                        'Client handoff',
                                    ].map((assignment, index) => (
                                        <div
                                            key={assignment}
                                            className="flex items-center gap-3 rounded-2xl border border-border p-3"
                                        >
                                            <span
                                                className={cn(
                                                    'flex size-9 items-center justify-center rounded-xl',
                                                    index === 1
                                                        ? 'bg-warning/15 text-warning'
                                                        : 'bg-brand/10 text-brand',
                                                )}
                                            >
                                                {index === 1 ? (
                                                    <ClipboardCheck
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <MapPinned
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">
                                                    {assignment}
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {index === 1
                                                        ? 'In progress'
                                                        : 'Assigned to a team'}
                                                </span>
                                            </span>
                                            <ArrowRight
                                                className="size-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section
                        id="capabilities"
                        className="border-y border-border bg-muted/50"
                    >
                        <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 sm:grid-cols-3 lg:px-8 lg:py-20">
                            {capabilities.map(
                                ({ icon: Icon, title, description }) => (
                                    <article key={title} className="space-y-4">
                                        <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-brand shadow-sm ring-1 ring-border">
                                            <Icon
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <h2 className="text-lg font-semibold">
                                            {title}
                                        </h2>
                                        <p className="leading-7 text-muted-foreground">
                                            {description}
                                        </p>
                                    </article>
                                ),
                            )}
                        </div>
                    </section>

                    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between lg:px-8 lg:py-20">
                        <div>
                            <div className="flex items-center gap-3">
                                <Users
                                    className="size-5 text-brand"
                                    aria-hidden="true"
                                />
                                <p className="text-sm font-medium text-brand">
                                    One workspace, many moving parts
                                </p>
                            </div>
                            <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">
                                Give every team member the context to do their
                                best work.
                            </h2>
                        </div>
                        <Link
                            href={auth.user ? dashboard() : login()}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-border px-5 font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:self-center"
                        >
                            Enter FieldOps
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </section>
                </main>
            </div>
        </>
    );
}
