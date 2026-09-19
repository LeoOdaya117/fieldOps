import {
    CalendarDays,
    Check,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    formatDateLabel,
    formatDateValue,
} from '@/components/ui/calendar';
import {
    DropdownMenu,
    DropdownMenuContent,
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
    const [draftFrom, setDraftFrom] = useState(initialFrom);
    const [draftTo, setDraftTo] = useState(initialTo);
    const [draftPresetKey, setDraftPresetKey] = useState(
        initialFrom || initialTo ? 'custom' : 'all',
    );
    const [customEditing, setCustomEditing] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() =>
        getMonth(initialFrom || initialTo),
    );

    const presets = createDateRangePresets();
    const selectedPreset = presets.find((preset) =>
        rangesMatch(range, preset.getRange()),
    );
    const displayValue = range ? formatRange(range) : 'Any date';

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setDraftFrom(range?.from ?? '');
            setDraftTo(range?.to ?? '');
            setDraftPresetKey(selectedPreset?.key ?? (range ? 'custom' : 'all'));
            setCustomEditing(false);
            setCalendarMonth(getMonth(range?.from ?? range?.to ?? ''));
        }

        setOpen(nextOpen);
    };

    const applyRange = (nextRange: DateRange | null) => {
        setRange(nextRange);
        onRangeChange?.(nextRange);
    };

    const choosePreset = (preset: DateRangePreset) => {
        const nextRange = preset.getRange();

        setDraftFrom(nextRange?.from ?? '');
        setDraftTo(nextRange?.to ?? '');
        setDraftPresetKey(preset.key);
        setCustomEditing(false);
        setCalendarMonth(getMonth(nextRange?.from ?? nextRange?.to ?? ''));
        applyRange(nextRange);
        setOpen(false);
    };

    const handleCalendarSelect = (value: string) => {
        setDraftPresetKey('custom');

        if (!draftFrom || draftTo) {
            setDraftFrom(value);
            setDraftTo('');

            return;
        }

        if (value < draftFrom) {
            setDraftFrom(value);
            setDraftTo(draftFrom);

            return;
        }

        setDraftTo(value);
    };

    const updateRange = () => {
        const nextRange = normalizeRange(draftFrom, draftTo);

        applyRange(nextRange);
        setCustomEditing(false);
        setOpen(false);
    };

    const cancelChanges = () => {
        setDraftFrom(range?.from ?? '');
        setDraftTo(range?.to ?? '');
        setCustomEditing(false);
        setOpen(false);
    };

    const presetOptions = (
        <div
            className={cn(
                'grid content-start gap-0.5',
                customEditing &&
                    'border-t border-border pt-3 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-3',
            )}
        >
            {presets.map((preset) => (
                <button
                    key={preset.key}
                    type="button"
                    aria-pressed={draftPresetKey === preset.key}
                    className={cn(
                        'flex min-h-8 items-center justify-between rounded-md px-2 text-left text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        draftPresetKey === preset.key &&
                            'bg-accent text-accent-foreground',
                    )}
                    onClick={() => choosePreset(preset)}
                >
                    <span>{preset.label}</span>
                    {draftPresetKey === preset.key ? (
                        <Check aria-hidden="true" className="size-4" />
                    ) : null}
                </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
                type="button"
                aria-pressed={draftPresetKey === 'custom'}
                className={cn(
                    'flex min-h-8 items-center justify-between rounded-md px-2 text-left text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    draftPresetKey === 'custom' &&
                        'bg-accent text-accent-foreground',
                )}
                onClick={() => {
                    setDraftPresetKey('custom');
                    setCustomEditing(true);
                    setCalendarMonth(getMonth(draftFrom || draftTo || ''));
                }}
            >
                <span>Custom range</span>
                {draftPresetKey === 'custom' ? (
                    <Check aria-hidden="true" className="size-4" />
                ) : null}
            </button>
        </div>
    );

    return (
        <>
            {fromName ? (
                <input
                    type="hidden"
                    name={fromName}
                    value={range?.from ?? ''}
                />
            ) : null}
            {toName ? (
                <input type="hidden" name={toName} value={range?.to ?? ''} />
            ) : null}
            <DropdownMenu open={open} onOpenChange={handleOpenChange}>
                <DropdownMenuTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        aria-label={label}
                        aria-expanded={open}
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
                        {open ? (
                            <ChevronUp
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground"
                            />
                        ) : (
                            <ChevronDown
                                aria-hidden="true"
                                className="size-4 shrink-0 text-muted-foreground"
                            />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className={cn(
                        'max-w-[calc(100vw-2rem)]',
                        customEditing
                            ? 'max-h-[min(36rem,calc(100vh-2rem))] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto p-0'
                            : 'w-52 p-1',
                    )}
                >
                    {customEditing ? (
                        <>
                            <div className="grid gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_10rem]">
                                <div className="max-w-full overflow-x-auto">
                                    <Calendar
                                        month={calendarMonth}
                                        numberOfMonths={2}
                                        rangeStart={draftFrom || undefined}
                                        rangeEnd={draftTo || undefined}
                                        onSelect={handleCalendarSelect}
                                        onMonthChange={setCalendarMonth}
                                    />
                                </div>
                                {presetOptions}
                            </div>
                            <div className="flex items-center justify-end gap-2 border-t border-border p-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={cancelChanges}
                                >
                                    Cancel
                                </Button>
                                <Button type="button" onClick={updateRange}>
                                    Update
                                </Button>
                            </div>
                        </>
                    ) : (
                        presetOptions
                    )}
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
            key: 'last-14-days',
            label: 'Last 14 days',
            getRange: () => rangeFromDaysAgo(13),
        },
        {
            key: 'last-30-days',
            label: 'Last 30 days',
            getRange: () => rangeFromDaysAgo(29),
        },
        {
            key: 'this-week',
            label: 'This week',
            getRange: () => weekRange(0),
        },
        {
            key: 'last-week',
            label: 'Last week',
            getRange: () => weekRange(-1),
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

function weekRange(offset: number): DateRange {
    const today = startOfDay(new Date());
    const day = today.getDay();
    const start = addDays(today, -day + offset * 7);

    return {
        from: formatDateValue(start),
        to: formatDateValue(addDays(start, 6)),
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
        from: year + '-01-01',
        to: year + '-12-31',
    };
}

function rangesMatch(left: DateRange | null, right: DateRange | null) {
    return left?.from === right?.from && left?.to === right?.to;
}

function normalizeRange(from: string, to: string): DateRange | null {
    if (!from && !to) {
        return null;
    }

    if (from && to && from > to) {
        return { from: to, to: from };
    }

    return { from, to };
}

function formatRange(range: DateRange) {
    if (!range.from && range.to) {
        return 'Through ' + formatDateLabel(range.to);
    }

    if (range.from && !range.to) {
        return 'From ' + formatDateLabel(range.from);
    }

    const from = formatDateLabel(range.from);
    const to = formatDateLabel(range.to);

    return from === to ? from : from + ' - ' + to;
}

function getMonth(value: string) {
    if (!value) {
        const today = new Date();

        return new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const [year, month] = value.split('-').map(Number);

    return new Date(year, month - 1, 1);
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
