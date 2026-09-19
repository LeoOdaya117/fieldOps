import { FormSelect } from '@/components/ui/form-select';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

type PageSizeSelectProps = {
    id?: string;
    name?: string;
    className?: string;
    'aria-label'?: string;
    pageSize?: number;
    onValueChange?: (value: string) => void;
};

function PageSizeSelect({
    pageSize = DEFAULT_PAGE_SIZE,
    onValueChange,
    ...props
}: PageSizeSelectProps) {
    return (
        <FormSelect
            {...props}
            defaultValue={String(pageSize)}
            options={PAGE_SIZE_OPTIONS.map((option) => ({
                value: String(option),
                label: option,
            }))}
            onValueChange={onValueChange}
            size="sm"
            className={cn('w-fit min-w-16', props.className)}
        />
    );
}

export {
    DEFAULT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    PageSizeSelect,
};
