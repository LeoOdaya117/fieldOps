import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type DateRange = {
    from: string;
    to: string;
};

type DateRangePreset = {
    key: string;
    label: string;
    getRange: () => DateRange | null;
};

type DateRangePickerProps = {
    id?: string;
    from?: string;
    to?: string;
    fromName?: string;
    toName?: string;
    label?: string;
    className?: string;
    onRangeChange?: (range: DateRange | null) => void;
};

function DateRangePicker({
    id,
    from: initialFrom = '',
    to: initialTo = '',
    fromName,
    toName,
    label = 'Date range',
    className,
    onRangeChange,
}: DateRangePickerProps) {
    const [range, setRange] = useState<DateRange | null>(() =>
        initialFrom || initialTo
            ? { from: initialFrom, to: initialTo }
            : null,
    );
    const [open, setOpen] = useState(false);
    const [customRangeOpen, setCustomRangeOpen] = useState(false);
    const [customFrom, setCustomFrom] = useState(initialFrom);
    const [customTo, setCustomTo] = useState(initialTo);

    const presets = createDateRangePresets();
    const selectedPreset = presets.find((preset) => {
        const presetRange = preset.getRange();

        return rangesMatch(range, presetRange);
    });

    const displayValue = range
        ? formatRange(range)
        : 'Any date';

    const applyRange = (nextRange: DateRange | null) => {
        setRange(nextRange);
        onRangeChange?.(nextRange);
    };

    const applyPreset = (preset: DateRangePreset) => {
        applyRange(preset.getRange());
        setCustomRangeOpen(false);
        setOpen(false);
    };

    const applyCustomRange = () => {
        if (!customFrom && !customTo) {
            applyRange(null);
        } else {
            const shouldSwap =
                Boolean(customFrom && customTo) && customFrom > customTo;

            applyRange({
                from: shouldSwap ? customTo : customFrom,
                to: shouldSwap ? customFrom : customTo,
            });
        }

        setOpen(false);
    };

    return (
        <>
            {fromName ? (
                <input type="hidden" name={fromName} value={range?.from ?? ''} />
            ) : null}
            {toName ? (
                <input type="hidden" name={toName} value={range?.to ?? ''} />
            ) : null}
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        aria-label={label}
                        className={cn(
                            'w-full justify-between bg-background font-normal',
                            !range && 'text-muted-foreground',
                            className,
                        )}
                    >
                        <span className="flex min-w-0 items-center gap-2 truncate">
                            <CalendarDays
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground"
                            />
                            <span className="truncate">{displayValue}</span>
                        </span>
                        <ChevronDown
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground"
                        />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-[min(20rem,calc(100vw-2rem))] p-1"
                >
                    {presets.map((preset) => (
                        <DropdownMenuItem
                            key={preset.key}
                            onSelect={() => applyPreset(preset)}
                            className="min-h-9 justify-between px-3"
                        >
                            {preset.label}
                            {selectedPreset?.key === preset.key ? (
                                <Check aria-hidden="true" className="size-4" />
                            ) : null}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={(event) => {
                            event.preventDefault();
                            setCustomFrom(range?.from ?? '');
                            setCustomTo(range?.to ?? '');
                            setCustomRangeOpen(true);
                        }}
                        className="min-h-9 justify-between px-3"
                    >
                        Custom range
                        {customRangeOpen ||
                        (!selectedPreset && range !== null) ? (
                            <Check aria-hidden="true" className="size-4" />
                        ) : null}
                    </DropdownMenuItem>
                    {customRangeOpen ? (
                        <div className="mt-1 grid gap-3 border-t border-border px-2 pt-3 pb-2">
                            <div className="grid gap-2">
                                <label
                                    htmlFor={`${id ?? 'date-range'}-from`}
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    From
                                </label>
                                <DatePicker
                                    id={`${id ?? 'date-range'}-from`}
                                    value={customFrom}
                                    onValueChange={setCustomFrom}
                                    aria-label="Date range from"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label
                                    htmlFor={`${id ?? 'date-range'}-to`}
                                    className="text-xs font-medium text-muted-foreground"
                                >
                                    To
                                </label>
                                <DatePicker
                                    id={`${id ?? 'date-range'}-to`}
                                    value={customTo}
                                    onValueChange={setCustomTo}
                                    aria-label="Date range to"
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                onClick={applyCustomRange}
                            >
                                Apply range
                            </Button>
                        </div>
                    ) : null}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}

function createDateRangePresets(): DateRangePreset[] {
    return [
        { key: 'all', label: 'All dates', getRange: () => null },
        {
            key: 'today',
            label: 'Today',
            getRange: () => rangeFromDaysAgo(0),
        },
        {
            key: 'yesterday',
            label: 'Yesterday',
            getRange: () => rangeFromDaysAgo(1),
        },
        {
            key: 'last-7-days',
            label: 'Last 7 days',
            getRange: () => rangeFromDaysAgo(6),
        },
        {
            key: 'last-30-days',
            label: 'Last 30 days',
            getRange: () => rangeFromDaysAgo(29),
        },
        {
            key: 'this-month',
            label: 'This month',
            getRange: () => monthRange(0),
        },
        {
            key: 'last-month',
            label: 'Last month',
            getRange: () => monthRange(-1),
        },
        {
            key: 'this-year',
            label: 'This year',
            getRange: () => yearRange(0),
        },
        {
            key: 'last-year',
            label: 'Last year',
            getRange: () => yearRange(-1),
        },
    ];
}

function rangeFromDaysAgo(daysAgo: number): DateRange {
    const today = startOfDay(new Date());

    return {
        from: formatDateValue(addDays(today, -daysAgo)),
        to: formatDateValue(today),
    };
}

function monthRange(offset: number): DateRange {
    const date = new Date();
    const first = new Date(date.getFullYear(), date.getMonth() + offset, 1);
    const last = new Date(date.getFullYear(), date.getMonth() + offset + 1, 0);

    return {
        from: formatDateValue(first),
        to: formatDateValue(last),
    };
}

function yearRange(offset: number): DateRange {
    const year = new Date().getFullYear() + offset;

    return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
    };
}

function rangesMatch(left: DateRange | null, right: DateRange | null) {
    return left?.from === right?.from && left?.to === right?.to;
}

function formatRange(range: DateRange) {
    if (!range.from && range.to) {
        return `Through ${formatDateLabel(range.to)}`;
    }

    if (range.from && !range.to) {
        return `From ${formatDateLabel(range.from)}`;
    }

    const from = formatDateLabel(range.from);
    const to = formatDateLabel(range.to);

    return from === to ? from : `${from} – ${to}`;
}

function formatDateValue(date: Date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatDateLabel(value: string) {
    const [year, month, day] = value.split('-').map(Number);

    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);

    return result;
}

export { DateRangePicker, type DateRange, type DateRangePickerProps };
