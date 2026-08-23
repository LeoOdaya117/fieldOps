import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { ActionLink } from '@/components/action-link';
import {
    DEFAULT_PAGE_SIZE,
    PageSizeSelect,
} from '@/components/ui/page-size-select';
import { cn } from '@/lib/utils';

export type TablePaginationProps = {
    currentPage: number;
    lastPage: number;
    total: number;
    from: number | null;
    to: number | null;
    pageSize?: number;
    position?: 'top' | 'bottom';
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
    pageSize = DEFAULT_PAGE_SIZE,
    position = 'bottom',
    itemLabel = 'items',
    previousUrl,
    nextUrl,
}: TablePaginationProps) {
    if (total === 0) {
        return null;
    }

    const pageSizeSelectId = `table-page-size-${position}`;

    const handlePageSizeChange = (
        event: ChangeEvent<HTMLSelectElement>,
    ) => {
        const url = new URL(window.location.href);

        url.searchParams.set('per_page', event.target.value);
        url.searchParams.delete('page');

        router.get(`${url.pathname}${url.search}`, {}, { preserveScroll: true });
    };

    return (
        <nav
            aria-label="Table pagination"
            className={cn(
                'flex flex-col gap-3 bg-muted/10 px-4 py-4 text-sm lg:flex-row lg:items-center lg:justify-between',
            )}
        >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-muted-foreground">
                <p>
                    <span className="font-medium text-foreground">
                        Showing {from ?? 0}–{to ?? 0} of {total} {itemLabel}
                    </span>
                </p>
                <label htmlFor={pageSizeSelectId} className="sr-only">
                    Rows per page
                </label>
                <PageSizeSelect
                    id={pageSizeSelectId}
                    aria-label="Rows per page"
                    pageSize={pageSize}
                    onChange={handlePageSizeChange}
                />
                <span aria-hidden="true">·</span>
                <span>
                    Page {currentPage} of {lastPage}
                </span>
            </div>
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
