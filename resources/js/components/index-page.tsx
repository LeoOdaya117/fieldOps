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
    headingLevel?: 2 | 3;
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <Heading
                        title={title}
                        description={description}
                        className="mb-0"
                    />
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
    headingLevel = 3,
    description,
    actions,
    toolbar,
    children,
    className,
}: IndexPageSectionProps) {
    const hasSectionHeader = Boolean(title || description);
    const hasSectionActions = Boolean(actions);
    const HeadingTag = headingLevel === 2 ? 'h2' : 'h3';

    return (
        <section className={cn('space-y-3', className)}>
            {hasSectionHeader || hasSectionActions ? (
                <div
                    className={cn(
                        'flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between',
                        !hasSectionHeader && 'sm:justify-end',
                    )}
                >
                    {hasSectionHeader ? (
                        <div className="min-w-0">
                            {title ? (
                                <HeadingTag className="text-base font-semibold tracking-tight">
                                    {title}
                                </HeadingTag>
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
