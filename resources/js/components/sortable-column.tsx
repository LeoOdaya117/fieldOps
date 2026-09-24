import { ArrowDownAZ, ArrowDownUp, ArrowUpAZ } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { cn } from '@/lib/utils';

type SortDirection = 'asc' | 'desc';
type QueryValue = string | readonly string[] | undefined;

type SortableColumnProps = {
    action: string;
    label: string;
    sortKey: string;
    sort?: string;
    direction?: SortDirection;
    sortParam?: string;
    directionParam?: string;
    hidden?: Record<string, QueryValue>;
};

function buildQueryUrl(action: string, values: Record<string, QueryValue>) {
    const params = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && typeof value !== 'string') {
            value.forEach((item) => {
                if (item !== '') {
                    params.append(`${key}[]`, item);
                }
            });

            return;
        }

        if (value !== undefined && value !== '') {
            params.set(key, value);
        }
    });

    const query = params.toString();

    return query === '' ? action : `${action}?${query}`;
}

function SortableColumn({
    action,
    label,
    sortKey,
    sort = '',
    direction = 'asc',
    sortParam = 'sort',
    directionParam = 'direction',
    hidden = {},
}: SortableColumnProps) {
    const isActive = sort === sortKey;
    const nextDirection: SortDirection =
        isActive && direction === 'asc' ? 'desc' : 'asc';
    const href = buildQueryUrl(action, {
        ...hidden,
        [sortParam]: sortKey,
        [directionParam]: nextDirection,
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
