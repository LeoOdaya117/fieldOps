import { ArrowDownAZ, ArrowDownUp, ArrowUpAZ } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { cn } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';

type SortableColumnProps = {
    action: string;
    label: string;
    sortKey: string;
    sort?: string;
    direction?: SortDirection;
    hidden?: Record<string, string | undefined>;
};

function buildQueryUrl(
    action: string,
    values: Record<string, string | undefined>,
) {
    const query = new URLSearchParams(
        Object.entries(values).filter(
            (entry): entry is [string, string] =>
                entry[1] !== undefined && entry[1] !== '',
        ),
    ).toString();

    return query === '' ? action : `${action}?${query}`;
}

function SortableColumn({
    action,
    label,
    sortKey,
    sort = '',
    direction = 'asc',
    hidden = {},
}: SortableColumnProps) {
    const isActive = sort === sortKey;
    const nextDirection: SortDirection =
        isActive && direction === 'asc' ? 'desc' : 'asc';
    const href = buildQueryUrl(action, {
        ...hidden,
        sort: sortKey,
        direction: nextDirection,
    });

    return (
        <ActionLink
            href={href}
            variant="ghost"
            size="sm"
            className={cn(
                'h-8 gap-1.5 px-2 text-xs font-semibold tracking-normal text-foreground normal-case hover:bg-muted',
                isActive && 'bg-link/10 text-link hover:bg-link/15',
            )}
            aria-label={`Sort ${label} ${nextDirection === 'asc' ? 'ascending' : 'descending'}`}
            aria-current={isActive ? 'true' : undefined}
        >
            <span>{label}</span>
            {isActive ? (
                direction === 'asc' ? (
                    <ArrowUpAZ
                        className="size-3.5 text-link"
                        aria-hidden="true"
                    />
                ) : (
                    <ArrowDownAZ
                        className="size-3.5 text-link"
                        aria-hidden="true"
                    />
                )
            ) : (
                <ArrowDownUp
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                />
            )}
            {isActive && (
                <span className="sr-only">
                    Currently sorted{' '}
                    {direction === 'asc' ? 'ascending' : 'descending'}
                </span>
            )}
        </ActionLink>
    );
}

export { SortableColumn };
