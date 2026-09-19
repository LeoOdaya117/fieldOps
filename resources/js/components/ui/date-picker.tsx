import { CalendarDays } from 'lucide-react';
import type { ChangeEvent, ComponentProps } from 'react';
import { Input } from '@/components/ui/input';

type DatePickerProps = Omit<
    ComponentProps<typeof Input>,
    'type' | 'value' | 'defaultValue' | 'onChange'
> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
};

function DatePicker({
    value,
    defaultValue = '',
    onValueChange,
    className,
    ...props
}: DatePickerProps) {
    const dateInputProps = {
        onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onValueChange?.(event.target.value),
        ...(value !== undefined ? { value } : { defaultValue }),
    };

    return (
        <div className="relative">
            <CalendarDays
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
                {...props}
                type="date"
                {...dateInputProps}
                className={`pl-9 ${className ?? ''}`}
            />
        </div>
    );
}

export { DatePicker, type DatePickerProps };
