import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    formatDateLabel,
} from '@/components/ui/calendar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type DatePickerProps = {
    id?: string;
    name?: string;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    'aria-label'?: string;
    onValueChange?: (value: string) => void;
};

function DatePicker({
    id,
    name,
    value,
    defaultValue = '',
    placeholder = 'Select date',
    className,
    disabled = false,
    'aria-label': ariaLabel,
    onValueChange,
}: DatePickerProps) {
    const [selectedDate, setSelectedDate] = useState(value ?? defaultValue);
    const [month, setMonth] = useState(() => getMonth(value ?? defaultValue));
    const [open, setOpen] = useState(false);
    const currentValue = value ?? selectedDate;

    const handleSelect = (nextValue: string) => {
        if (value === undefined) {
            setSelectedDate(nextValue);
        }

        onValueChange?.(nextValue);
        setOpen(false);
    };

    return (
        <>
            {name ? (
                <input type="hidden" name={name} value={currentValue} />
            ) : null}
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        aria-label={ariaLabel}
                        className={cn(
                            'w-full justify-between bg-background font-normal',
                            !currentValue && 'text-muted-foreground',
                            className,
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2 truncate">
                            <CalendarDays
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground"
                            />
                            <span className="truncate">
                                {currentValue
                                    ? formatDateLabel(currentValue)
                                    : placeholder}
                            </span>
                        </span>
                        <ChevronDown
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground"
                        />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="p-0">
                    <Calendar
                        month={month}
                        selected={currentValue}
                        onSelect={handleSelect}
                        onMonthChange={setMonth}
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

function getMonth(value: string) {
    if (!value) {
        const today = new Date();

        return new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const [year, month] = value.split('-').map(Number);

    return new Date(year, month - 1, 1);
}

export { DatePicker, formatDateLabel, type DatePickerProps };
