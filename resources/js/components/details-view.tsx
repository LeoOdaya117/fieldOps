import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type DetailsColumn<T> = {
    key: string;
    label: ReactNode;
    accessor?: keyof T | ((record: T) => ReactNode);
    cell?: (record: T) => ReactNode;
    span?: 1 | 2 | 3 | 4 | 'full';
    className?: string;
    valueClassName?: string;
};

type DetailsSection<T> = {
    key: string;
    title?: ReactNode;
    description?: ReactNode;
    columns?: readonly DetailsColumn<T>[];
    content?: ReactNode | ((record: T) => ReactNode);
    className?: string;
};

type DetailsViewProps<T> = {
    record: T;
    summary?: ReactNode;
    sections: readonly DetailsSection<T>[];
    className?: string;
};

function columnSpanClass(span: DetailsColumn<unknown>['span']): string {
    switch (span) {
        case 'full':
            return 'col-span-full';
        case 1:
            return 'lg:col-span-1';
        case 3:
            return 'lg:col-span-3';
        case 4:
            return 'lg:col-span-4';
        case 2:
        default:
            return 'lg:col-span-2';
    }
}

function resolveColumnValue<T>(column: DetailsColumn<T>, record: T): ReactNode {
    if (column.cell) {
        return column.cell(record);
    }

    if (typeof column.accessor === 'function') {
        return column.accessor(record);
    }

    if (column.accessor) {
        return record[column.accessor] as ReactNode;
    }

    return null;
}

function DetailsView<T>({
    record,
    summary,
    sections,
    className,
}: DetailsViewProps<T>) {
    return (
        <div
            data-slot="details-view"
            className={cn(
                'overflow-hidden rounded-[var(--platform-panel-radius)] border border-border/80 bg-card text-card-foreground shadow-[var(--platform-panel-shadow)]',
                className,
            )}
        >
            {summary !== undefined && summary !== null ? (
                <div
                    data-slot="details-summary"
                    className="border-b border-border bg-muted/10 px-4 py-5 sm:px-6 sm:py-6"
                >
                    {summary}
                </div>
            ) : null}

            {sections.map((section, index) => {
                const sectionId = `details-section-${index}`;
                const content =
                    typeof section.content === 'function'
                        ? section.content(record)
                        : section.content;

                return (
                    <section
                        key={section.key}
                        data-slot="details-section"
                        aria-labelledby={section.title ? sectionId : undefined}
                        className={cn(
                            index > 0 && 'border-t border-border',
                            'px-4 py-5 sm:px-6 sm:py-6',
                            section.className,
                        )}
                    >
                        {section.title || section.description ? (
                            <div className="mb-5 max-w-3xl">
                                {section.title ? (
                                    <h2
                                        id={sectionId}
                                        className="text-base font-semibold tracking-tight"
                                    >
                                        {section.title}
                                    </h2>
                                ) : null}
                                {section.description ? (
                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        {section.description}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {section.columns && section.columns.length > 0 ? (
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                                {section.columns.map((column) => {
                                    const value = resolveColumnValue(
                                        column,
                                        record,
                                    );
                                    const hasValue =
                                        value !== null &&
                                        value !== undefined &&
                                        value !== '';

                                    return (
                                        <div
                                            key={column.key}
                                            className={cn(
                                                'min-w-0 lg:col-span-2',
                                                columnSpanClass(column.span),
                                                column.className,
                                            )}
                                        >
                                            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                {column.label}
                                            </dt>
                                            <dd
                                                className={cn(
                                                    'mt-1.5 min-w-0 text-sm text-foreground',
                                                    column.valueClassName,
                                                )}
                                            >
                                                {hasValue ? (
                                                    value
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        Not recorded
                                                    </span>
                                                )}
                                            </dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        ) : null}

                        {content !== undefined && content !== null ? (
                            <div
                                className={cn(
                                    section.columns &&
                                        section.columns.length > 0 &&
                                        'mt-6',
                                )}
                            >
                                {content}
                            </div>
                        ) : null}
                    </section>
                );
            })}
        </div>
    );
}

export type { DetailsColumn, DetailsSection, DetailsViewProps };
export { DetailsView };
