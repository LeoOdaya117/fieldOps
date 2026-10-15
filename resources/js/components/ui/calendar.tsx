import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CalendarProps = {
    month: Date;
    numberOfMonths?: 1 | 2;
    selected?: string;
    rangeStart?: string;
    rangeEnd?: string;
    onSelect: (value: string) => void;
    onMonthChange: (month: Date) => void;
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function Calendar({
    month,
    numberOfMonths = 1,
    selected,
    rangeStart,
    rangeEnd,
    onSelect,
    onMonthChange,
}: CalendarProps) {
    return (
        <div
            className={cn(
                'grid gap-5 bg-popover text-popover-foreground',
                numberOfMonths === 2 && 'grid-cols-2',
            )}
        >
            {Array.from({ length: numberOfMonths }, (_, monthIndex) => (
                <MonthCalendar
                    key={formatDateValue(addMonths(month, monthIndex))}
                    month={addMonths(month, monthIndex)}
                    showPrevious={monthIndex === 0}
                    showNext={monthIndex === numberOfMonths - 1}
                    selected={selected}
                    rangeStart={rangeStart}
                    rangeEnd={rangeEnd}
                    onSelect={onSelect}
                    onMonthChange={onMonthChange}
                />
            ))}
        </div>
    );
}

function MonthCalendar({
    month,
    showPrevious,
    showNext,
    selected,
    rangeStart,
    rangeEnd,
    onSelect,
    onMonthChange,
}: CalendarProps & { showPrevious: boolean; showNext: boolean }) {
    const days = getMonthDays(month);
    const monthLabel = new Intl.DateTimeFormat(undefined, {
        month: 'long',
        year: 'numeric',
    }).format(month);

    return (
        <div className="w-56">
            <div className="mb-2 flex h-8 items-center justify-between">
                {showPrevious ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Previous month"
                        className="size-7"
                        onClick={() => onMonthChange(addMonths(month, -1))}
                    >
                        <ChevronLeft aria-hidden="true" />
                    </Button>
                ) : (
                    <span className="size-7" />
                )}
                <p className="text-xs font-semibold">{monthLabel}</p>
                {showNext ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Next month"
                        className="size-7"
                        onClick={() => onMonthChange(addMonths(month, 1))}
                    >
                        <ChevronRight aria-hidden="true" />
                    </Button>
                ) : (
                    <span className="size-7" />
                )}
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground">
                {WEEKDAYS.map((weekday) => (
                    <span key={weekday} className="py-0.5 font-medium">
                        {weekday}
                    </span>
                ))}
                {days.map((day, index) => {
                    if (!day) {
                        return (
                            <span
                                key={'empty-' + index}
                                className="size-8"
                            />
                        );
                    }

                    const value = formatDateValue(day);
                    const isSelected = selected === value;
                    const isRangeStart = rangeStart === value;
                    const isRangeEnd = rangeEnd === value;
                    const isInRange =
                        rangeStart !== undefined &&
                        rangeEnd !== undefined &&
                        value >= rangeStart &&
                        value <= rangeEnd;

                    return (
                        <button
                            key={value}
                            type="button"
                            aria-label={formatDateLabel(value)}
                            aria-pressed={isSelected || isRangeStart || isRangeEnd}
                            className={cn(
                                'relative flex size-8 items-center justify-center rounded-md text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                isInRange && 'rounded-none bg-accent/60',
                                (isRangeStart || isRangeEnd || isSelected) &&
                                    'rounded-md bg-primary font-medium text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
                            )}
                            onClick={() => onSelect(value)}
                        >
                            {day.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function getMonthDays(month: Date): (Date | null)[] {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const days: (Date | null)[] = Array.from(
        { length: firstDay },
        () => null,
    );

    for (let day = 1; day <= daysInMonth; day += 1) {
        days.push(new Date(year, monthIndex, day));
    }

    while (days.length % 7 !== 0) {
        days.push(null);
    }

    return days;
}

function addMonths(date: Date, months: number) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
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

export { Calendar, formatDateLabel, formatDateValue, type CalendarProps };
