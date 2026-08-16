import { Head } from '@inertiajs/react';
import {
    ArrowUpRight,
    CalendarClock,
    CheckCircle2,
    ClipboardCheck,
    Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

const metrics = [
    {
        label: 'Active assignments',
        value: '24',
        change: '+12%',
        icon: ClipboardCheck,
        tone: 'text-brand',
        surface: 'bg-brand/10',
    },
    {
        label: 'Completed this week',
        value: '86',
        change: '+8%',
        icon: CheckCircle2,
        tone: 'text-success',
        surface: 'bg-success/10',
    },
    {
        label: 'Team members',
        value: '18',
        change: '3 available',
        icon: Users,
        tone: 'text-info',
        surface: 'bg-info/10',
    },
];

const assignments = [
    {
        name: 'North district sweep',
        owner: 'Maya Santos',
        status: 'In progress',
        statusClass: 'bg-brand/10 text-brand',
    },
    {
        name: 'Warehouse audit',
        owner: 'Jon Bell',
        status: 'Needs review',
        statusClass: 'bg-warning/15 text-warning-foreground',
    },
    {
        name: 'Client handoff',
        owner: 'Ari Chen',
        status: 'Scheduled',
        statusClass: 'bg-muted text-muted-foreground',
    },
];

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-8 p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-brand">
                            Tuesday, October 14
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                            Good morning, team.
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            Here is what needs your attention across the field.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground sm:self-auto">
                        <CalendarClock className="size-4 text-brand" />
                        <span>Last synced just now</span>
                    </div>
                </header>

                <section
                    aria-label="Operations summary"
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {metrics.map(
                        ({
                            label,
                            value,
                            change,
                            icon: Icon,
                            tone,
                            surface,
                        }) => (
                            <Card key={label}>
                                <CardContent className="flex items-start justify-between p-6">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            {label}
                                        </p>
                                        <p className="mt-3 text-3xl font-semibold tracking-tight">
                                            {value}
                                        </p>
                                        <p className="mt-2 text-xs font-medium text-success">
                                            {change}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'flex size-11 items-center justify-center rounded-2xl',
                                            surface,
                                            tone,
                                        )}
                                    >
                                        <Icon
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                </CardContent>
                            </Card>
                        ),
                    )}
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent assignments</CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Work that needs a decision or follow-up.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                            >
                                View all
                                <ArrowUpRight className="size-4" />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {assignments.map((assignment) => (
                                <div
                                    key={assignment.name}
                                    className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {assignment.name}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Owner: {assignment.owner}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            'self-start rounded-full px-3 py-1 text-xs font-medium sm:self-auto',
                                            assignment.statusClass,
                                        )}
                                    >
                                        {assignment.status}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Team pulse</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Availability for today.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between">
                                <p className="text-4xl font-semibold">86%</p>
                                <p className="text-sm font-medium text-success">
                                    On track
                                </p>
                            </div>
                            <div
                                className="mt-5 h-3 overflow-hidden rounded-full bg-muted"
                                role="progressbar"
                                aria-label="Team availability"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={86}
                            >
                                <div className="h-full w-[86%] rounded-full bg-brand" />
                            </div>
                            <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
                                <span>15 available</span>
                                <span>3 in the field</span>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
