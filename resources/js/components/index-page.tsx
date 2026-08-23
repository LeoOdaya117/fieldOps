import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import Heading from '@/components/heading';
import { cn } from '@/lib/utils';

type IndexPageProps = {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
};

type IndexPageSectionProps = {
    title?: string;
    description?: string;
    actions?: ReactNode;
    toolbar?: ReactNode;
    children: ReactNode;
    className?: string;
};

function IndexPage({
    title,
    description,
    actions,
    children,
    className,
}: IndexPageProps) {
    return (
        <>
            <Head title={title} />
            <div
                data-slot="index-page"
                className={cn('space-y-6 p-4 sm:p-6 lg:p-8', className)}
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading title={title} description={description} />
                    {actions ? (
                        <div className="flex flex-wrap gap-2">{actions}</div>
                    ) : null}
                </div>
                {children}
            </div>
        </>
    );
}

function IndexPageSection({
    title,
    description,
    actions,
    toolbar,
    children,
    className,
}: IndexPageSectionProps) {
    const hasSectionHeader = Boolean(title || description);
    const hasSectionActions = Boolean(actions);

    return (
        <section className={cn('space-y-3', className)}>
            {hasSectionHeader || hasSectionActions ? (
                <div
                    className={cn(
                        'flex flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-between',
                        !hasSectionHeader && 'sm:justify-end',
                    )}
                >
                    {hasSectionHeader ? (
                        <div className="min-w-0">
                            {title ? (
                                <h3 className="text-base font-semibold tracking-tight">
                                    {title}
                                </h3>
                            ) : null}
                            {description ? (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {description}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    {hasSectionActions ? (
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {actions}
                        </div>
                    ) : null}
                </div>
            ) : null}
            <Card className="gap-0 overflow-hidden py-0">
                {toolbar ? (
                    <div
                        data-slot="index-page-toolbar"
                        className="flex flex-col gap-3 border-b border-border bg-muted/15 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                        {toolbar}
                    </div>
                ) : null}
                {children}
            </Card>
        </section>
    );
}

export { IndexPage, IndexPageSection };
