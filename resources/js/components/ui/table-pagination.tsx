import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { ActionLink } from '@/components/action-link';
import {
    DEFAULT_PAGE_SIZE,
    PageSizeSelect,
} from '@/components/ui/page-size-select';
import { cn } from '@/lib/utils';

export type TablePaginationLink = {
    url: string | null;
    label: string;
    active?: boolean;
};

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
    links?: readonly TablePaginationLink[];
};

type PageItem =
    | { type: 'page'; page: number; url: string; active: boolean }
    | { type: 'ellipsis'; key: string };

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
    links,
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

    const pageItems = getPageItems({
        currentPage,
        lastPage,
        links,
    });

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
            <div className="flex items-center justify-end gap-1">
                {previousUrl ? (
                    <ActionLink
                        href={previousUrl}
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-md"
                        aria-label="Previous page"
                    >
                        <ChevronLeft aria-hidden="true" />
                    </ActionLink>
                ) : (
                    <span
                        role="button"
                        aria-disabled="true"
                        aria-label="Previous page"
                        className="inline-flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground opacity-50"
                    >
                        <ChevronLeft aria-hidden="true" />
                    </span>
                )}

                <div
                    data-slot="table-page-links"
                    className="flex items-center gap-1"
                >
                    {pageItems.map((item) =>
                        item.type === 'ellipsis' ? (
                            <span
                                key={item.key}
                                aria-hidden="true"
                                className="inline-flex size-8 items-center justify-center text-sm text-muted-foreground"
                            >
                                …
                            </span>
                        ) : (
                            <ActionLink
                                key={item.page}
                                href={item.url}
                                variant={item.active ? 'default' : 'ghost'}
                                size="icon"
                                className="size-8 rounded-md tabular-nums"
                                aria-current={
                                    item.active ? 'page' : undefined
                                }
                                aria-label={`Page ${item.page}`}
                            >
                                {item.page}
                            </ActionLink>
                        ),
                    )}
                </div>

                {nextUrl ? (
                    <ActionLink
                        href={nextUrl}
                        variant="outline"
                        size="icon"
                        className="size-8 rounded-md"
                        aria-label="Next page"
                    >
                        <ChevronRight aria-hidden="true" />
                    </ActionLink>
                ) : (
                    <span
                        role="button"
                        aria-disabled="true"
                        aria-label="Next page"
                        className="inline-flex size-8 items-center justify-center rounded-md border border-input text-muted-foreground opacity-50"
                    >
                        <ChevronRight aria-hidden="true" />
                    </span>
                )}
            </div>
        </nav>
    );
}

function getPageItems({
    currentPage,
    lastPage,
    links,
}: Pick<TablePaginationProps, 'currentPage' | 'lastPage' | 'links'>): PageItem[] {
    if (links && links.length > 0) {
        const items: PageItem[] = [];
        let ellipsisIndex = 0;

        for (const link of links) {
            const label = link.label.replace(/&(?:hellip|#8230);/g, '…').trim();

            if (/^\d+$/.test(label) && link.url !== null) {
                const page = Number(label);

                items.push({
                    type: 'page',
                    page,
                    url: link.url,
                    active: link.active ?? page === currentPage,
                });
            } else if (label === '...' || label === '…') {
                items.push({
                    type: 'ellipsis',
                    key: `ellipsis-${ellipsisIndex++}`,
                });
            }
        }

        if (items.some((item) => item.type === 'page')) {
            return items;
        }
    }

    return fallbackPageItems(currentPage, lastPage);
}

function fallbackPageItems(currentPage: number, lastPage: number): PageItem[] {
    const visiblePages = new Set(
        [1, lastPage, currentPage - 1, currentPage, currentPage + 1].filter(
            (page) => page >= 1 && page <= lastPage,
        ),
    );
    const pages = [...visiblePages].sort((a, b) => a - b);
    const items: PageItem[] = [];
    let previousPage = 0;

    pages.forEach((page) => {
        if (page - previousPage > 1) {
            items.push({
                type: 'ellipsis',
                key: `fallback-ellipsis-${page}`,
            });
        }

        const url = new URL(window.location.href);
        url.searchParams.set('page', String(page));

        items.push({
            type: 'page',
            page,
            url: `${url.pathname}${url.search}`,
            active: page === currentPage,
        });
        previousPage = page;
    });

    return items;
}
