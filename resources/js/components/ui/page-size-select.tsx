import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

type PageSizeSelectProps = Omit<ComponentProps<'select'>, 'children'> & {
    pageSize?: number;
};

function PageSizeSelect({
    pageSize = DEFAULT_PAGE_SIZE,
    className,
    ...props
}: PageSizeSelectProps) {
    return (
        <select
            {...props}
            defaultValue={pageSize}
            className={cn(
                'h-8 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                className,
            )}
        >
            {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                    {option}
                </option>
            ))}
        </select>
    );
}

export {
    DEFAULT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    PageSizeSelect,
};
