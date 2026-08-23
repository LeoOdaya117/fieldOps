import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ActionLink } from '@/components/action-link';

type TablePaginationProps = {
    currentPage: number;
    lastPage: number;
    total: number;
    from: number | null;
    to: number | null;
    itemLabel?: string;
    previousUrl?: string | null;
    nextUrl?: string | null;
};

export function TablePagination({
    currentPage,
    lastPage,
    total,
    from,
    to,
    itemLabel = 'items',
    previousUrl,
    nextUrl,
}: TablePaginationProps) {
    if (total === 0) {
        return null;
    }

    return (
        <nav
            aria-label="Table pagination"
            className="flex flex-col gap-3 border-t border-border bg-muted/10 px-6 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
            <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                    Showing {from ?? 0}–{to ?? 0} of {total} {itemLabel}
                </span>{' '}
                <span aria-hidden="true">·</span>{' '}
                Page {currentPage} of {lastPage}
            </p>
            <div className="flex items-center gap-2">
                {previousUrl ? (
                    <ActionLink
                        href={previousUrl}
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                    >
                        <ChevronLeft />
                        Previous
                    </ActionLink>
                ) : (
                    <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground opacity-50">
                        <ChevronLeft />
                        Previous
                    </span>
                )}
                {nextUrl ? (
                    <ActionLink
                        href={nextUrl}
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                    >
                        Next
                        <ChevronRight />
                    </ActionLink>
                ) : (
                    <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground opacity-50">
                        Next
                        <ChevronRight />
                    </span>
                )}
            </div>
        </nav>
    );
}
