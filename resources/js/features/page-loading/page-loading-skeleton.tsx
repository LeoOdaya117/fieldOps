import { Skeleton } from '@/components/ui/skeleton';
import type { PageFamily } from '@/features/page-loading/page-families';

function PageHeading() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-8 w-2/3 max-w-sm" />
            <Skeleton className="h-4 w-full max-w-xl" />
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeading />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <div
                        key={index}
                        className="space-y-4 rounded-xl border border-border bg-card p-5"
                    >
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-8 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <div className="space-y-5 rounded-xl border border-border bg-card p-5">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-56 w-full" />
                </div>
                <div className="space-y-5 rounded-xl border border-border bg-card p-5">
                    <Skeleton className="h-5 w-1/2" />
                    {Array.from({ length: 4 }, (_, index) => (
                        <Skeleton key={index} className="h-10 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function ListSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeading />
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <Skeleton className="h-10 w-full sm:max-w-xs" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-28" />
                </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(5rem,0.7fr)_auto] gap-4 border-b border-border p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_minmax(7rem,0.8fr)_auto]">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="hidden h-4 w-2/3 sm:block" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="hidden h-4 w-12 lg:block" />
                </div>
                {Array.from({ length: 6 }, (_, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[minmax(0,1.5fr)_minmax(5rem,0.7fr)_auto] items-center gap-4 border-b border-border p-4 last:border-b-0 lg:grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_minmax(7rem,0.8fr)_auto]"
                    >
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full max-w-48" />
                            <Skeleton className="h-3 w-2/3 max-w-32 sm:hidden" />
                        </div>
                        <Skeleton className="hidden h-4 w-4/5 sm:block" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="hidden h-8 w-8 lg:block" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-4 w-28" />
            <PageHeading />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
                <section className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-7">
                    <Skeleton className="h-5 w-1/3" />
                    <div className="grid gap-5 sm:grid-cols-2">
                        {Array.from({ length: 6 }, (_, index) => (
                            <div key={index} className="space-y-2">
                                <Skeleton className="h-3 w-1/2" />
                                <Skeleton className="h-5 w-full max-w-48" />
                            </div>
                        ))}
                    </div>
                </section>
                <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-full" />
                </section>
            </div>
        </div>
    );
}

function FormSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeading />
            <section className="max-w-4xl space-y-6 rounded-xl border border-border bg-card p-5 sm:p-7">
                <Skeleton className="h-5 w-1/3" />
                <div className="grid gap-5 sm:grid-cols-2">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div key={index} className="space-y-2">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-11 w-full" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-24 w-full" />
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Skeleton className="h-10 w-full sm:w-28" />
                    <Skeleton className="h-10 w-full sm:w-32" />
                </div>
            </section>
        </div>
    );
}

function SettingsSkeleton() {
    return (
        <div className="space-y-7">
            <PageHeading />
            <div className="grid gap-7 lg:grid-cols-[12rem_minmax(0,1fr)]">
                <aside className="hidden space-y-3 lg:block">
                    {Array.from({ length: 5 }, (_, index) => (
                        <Skeleton key={index} className="h-10 w-full" />
                    ))}
                </aside>
                <section className="space-y-6 rounded-xl border border-border bg-card p-5 sm:p-7">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-full max-w-lg" />
                    {Array.from({ length: 4 }, (_, index) => (
                        <div key={index} className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-11 w-full" />
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}

function AuthSkeleton() {
    return (
        <div className="mx-auto w-full max-w-md space-y-7">
            <div className="space-y-3 sm:text-center">
                <Skeleton className="mx-auto h-8 w-2/3" />
                <Skeleton className="mx-auto h-4 w-full max-w-xs" />
            </div>
            <div className="space-y-5">
                {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-11 w-full" />
                    </div>
                ))}
                <Skeleton className="h-11 w-full" />
            </div>
        </div>
    );
}

function LandingSkeleton() {
    return (
        <div className="mx-auto grid min-h-[60svh] w-full max-w-7xl items-center gap-10 md:grid-cols-2">
            <div className="space-y-6">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-12 w-full max-w-xl" />
                <Skeleton className="h-5 w-full max-w-lg" />
                <Skeleton className="h-5 w-4/5 max-w-md" />
                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <Skeleton className="h-12 w-full sm:w-40" />
                    <Skeleton className="h-12 w-full sm:w-36" />
                </div>
            </div>
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        </div>
    );
}

function GenericSkeleton() {
    return (
        <div className="space-y-6">
            <PageHeading />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }, (_, index) => (
                    <div
                        key={index}
                        className="space-y-4 rounded-xl border border-border bg-card p-5"
                    >
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ))}
            </div>
        </div>
    );
}

const skeletons: Record<PageFamily, () => React.ReactNode> = {
    landing: LandingSkeleton,
    dashboard: DashboardSkeleton,
    list: ListSkeleton,
    detail: DetailSkeleton,
    form: FormSkeleton,
    settings: SettingsSkeleton,
    auth: AuthSkeleton,
    generic: GenericSkeleton,
};

export function PageLoadingSkeleton({ family }: { family: PageFamily }) {
    const SkeletonContent = skeletons[family] ?? GenericSkeleton;

    return (
        <div
            role="status"
            aria-label="Loading page"
            aria-busy="true"
            aria-live="polite"
            data-page-loading-family={family}
            className="min-w-0 animate-in p-4 duration-150 fade-in motion-reduce:animate-none motion-reduce:duration-0 sm:p-6 lg:p-8"
        >
            <span className="sr-only">Loading page</span>
            <SkeletonContent />
        </div>
    );
}
