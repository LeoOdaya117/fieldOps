import { Check, ChevronDown, Search } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const CHECKBOX_OPTION_LIMIT = 5;
const SEARCH_OPTION_LIMIT = 10;

export type AdaptiveSelectOption = {
    value: string;
    label: ReactNode;
    searchText?: string;
    disabled?: boolean;
};

export type AdaptiveSelectValue = string | string[];

type AdaptiveSelectProps = Omit<
    ComponentProps<typeof SelectTrigger>,
    | 'children'
    | 'value'
    | 'defaultValue'
    | 'onValueChange'
    | 'size'
> & {
    name?: string;
    options: readonly AdaptiveSelectOption[];
    value?: AdaptiveSelectValue;
    defaultValue?: AdaptiveSelectValue;
    multiple?: boolean;
    placeholder?: ReactNode;
    searchPlaceholder?: string;
    emptyMessage?: ReactNode;
    required?: boolean;
    onValueChange?: (value: AdaptiveSelectValue) => void;
};

function AdaptiveSelect({
    name,
    options,
    value,
    defaultValue,
    multiple = false,
    placeholder = 'Select an option',
    searchPlaceholder = 'Search options',
    emptyMessage = 'No options found.',
    required = false,
    onValueChange,
    disabled = false,
    className,
    id,
    'aria-label': ariaLabel,
    ...triggerProps
}: AdaptiveSelectProps) {
    const selectableOptions = options.filter((option) => option.value !== '');
    const [internalValue, setInternalValue] = useState<AdaptiveSelectValue>(
        () => normalizeValue(defaultValue, multiple),
    );
    const currentValue =
        value === undefined
            ? internalValue
            : normalizeValue(value, multiple);
    const selectedValues = toValues(currentValue);
    const usesCheckboxes = selectableOptions.length <= CHECKBOX_OPTION_LIMIT;
    const usesSearch = selectableOptions.length > SEARCH_OPTION_LIMIT;
    const formName = name && multiple && !name.endsWith('[]') ? `${name}[]` : name;

    const updateValue = (nextValue: AdaptiveSelectValue) => {
        if (value === undefined) {
            setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
    };

    const handleOptionToggle = (optionValue: string) => {
        if (!multiple) {
            updateValue(optionValue);

            return;
        }

        const nextValues = selectedValues.includes(optionValue)
            ? selectedValues.filter((selectedValue) => selectedValue !== optionValue)
            : [...selectedValues, optionValue];

        updateValue(nextValues);
    };

    const hiddenInputs = formName ? (
        selectedValues.length > 0 ? (
            selectedValues.map((selectedValue, index) => (
                <input
                    key={`${selectedValue}-${index}`}
                    type="hidden"
                    name={formName}
                    value={selectedValue}
                />
            ))
        ) : (
            <input type="hidden" name={formName} value="" />
        )
    ) : null;

    const sharedProps = {
        id,
        options: selectableOptions,
        selectedValues,
        multiple,
        disabled,
        ariaLabel,
        placeholder,
        searchPlaceholder,
        emptyMessage,
        onOptionToggle: handleOptionToggle,
    };

    return (
        <>
            {hiddenInputs}
            {usesCheckboxes ? (
                <CheckboxOptions {...sharedProps} />
            ) : usesSearch || multiple ? (
                <SearchableOptions
                    {...sharedProps}
                    enableSearch={usesSearch}
                    className={className}
                />
            ) : (
                <Select
                    value={selectedValues[0] ?? ''}
                    onValueChange={handleOptionToggle}
                    disabled={disabled}
                    required={required}
                >
                    <SelectTrigger
                        {...triggerProps}
                        id={id}
                        aria-label={ariaLabel}
                        disabled={disabled}
                        className={cn('w-full', className)}
                    >
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                        {selectableOptions.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </>
    );
}

type OptionRendererProps = {
    id?: string;
    options: readonly AdaptiveSelectOption[];
    selectedValues: string[];
    multiple: boolean;
    disabled: boolean;
    ariaLabel?: string;
    placeholder: ReactNode;
    searchPlaceholder: string;
    emptyMessage: ReactNode;
    onOptionToggle: (value: string) => void;
};

function CheckboxOptions({
    id,
    options,
    selectedValues,
    disabled,
    ariaLabel,
    onOptionToggle,
}: Omit<
    OptionRendererProps,
    'placeholder' | 'searchPlaceholder' | 'emptyMessage' | 'multiple'
>) {
    return (
        <div
            role="group"
            aria-label={ariaLabel ?? 'Options'}
            className="grid gap-3"
        >
            {options.map((option, index) => {
                const optionId = `${id ?? 'adaptive-option'}-${index}`;

                return (
                    <label
                        key={option.value}
                        htmlFor={optionId}
                        className={cn(
                            'flex cursor-pointer items-center gap-2 text-sm',
                            (disabled || option.disabled) &&
                                'cursor-not-allowed opacity-50',
                        )}
                    >
                        <Checkbox
                            id={optionId}
                            checked={selectedValues.includes(option.value)}
                            disabled={disabled || option.disabled}
                            onCheckedChange={() => onOptionToggle(option.value)}
                        />
                        <span>{option.label}</span>
                    </label>
                );
            })}
        </div>
    );
}

function SearchableOptions({
    id,
    options,
    selectedValues,
    multiple,
    disabled,
    ariaLabel,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    onOptionToggle,
    enableSearch,
    className,
}: OptionRendererProps & { enableSearch: boolean; className?: string }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return options;
        }

        return options.filter((option) =>
            getSearchText(option).toLowerCase().includes(normalizedQuery),
        );
    }, [options, query]);
    const selectedOptions = options.filter((option) =>
        selectedValues.includes(option.value),
    );
    const triggerLabel = getTriggerLabel(
        selectedOptions,
        selectedValues,
        multiple,
        placeholder,
    );

    return (
        <DropdownMenu
            open={open}
            onOpenChange={(nextOpen) => {
                setOpen(nextOpen);

                if (nextOpen && enableSearch) {
                    setTimeout(() => searchInputRef.current?.focus(), 0);
                }

                if (!nextOpen) {
                    setQuery('');
                }
            }}
        >
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    id={id}
                    aria-label={ariaLabel}
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                        className,
                    )}
                >
                    <span className="min-w-0 truncate">{triggerLabel}</span>
                    <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground"
                    />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-[min(20rem,calc(100vw-2rem))] p-1"
            >
                {enableSearch ? (
                    <div
                        className="relative px-1 pb-1"
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        <Search
                            aria-hidden="true"
                            className="absolute top-2.5 left-3 size-4 text-muted-foreground"
                        />
                        <Input
                            ref={searchInputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key !== 'Escape') {
                                    event.stopPropagation();
                                }
                            }}
                            aria-label={searchPlaceholder}
                            placeholder={searchPlaceholder}
                            className="h-9 pl-8"
                        />
                    </div>
                ) : null}
                <div className="max-h-64 overflow-y-auto p-1">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) =>
                            multiple ? (
                                <DropdownMenuCheckboxItem
                                    key={option.value}
                                    checked={selectedValues.includes(option.value)}
                                    disabled={disabled || option.disabled}
                                    onSelect={(event) => event.preventDefault()}
                                    onCheckedChange={() =>
                                        onOptionToggle(option.value)
                                    }
                                >
                                    {option.label}
                                </DropdownMenuCheckboxItem>
                            ) : (
                                <DropdownMenuItem
                                    key={option.value}
                                    disabled={disabled || option.disabled}
                                    onSelect={() => onOptionToggle(option.value)}
                                >
                                    <span className="min-w-0 flex-1 truncate">
                                        {option.label}
                                    </span>
                                    {selectedValues.includes(option.value) ? (
                                        <Check
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                    ) : null}
                                </DropdownMenuItem>
                            ),
                        )
                    ) : (
                        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                            {emptyMessage}
                        </p>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function normalizeValue(
    value: AdaptiveSelectValue | undefined,
    multiple: boolean,
): AdaptiveSelectValue {
    if (multiple) {
        return Array.isArray(value) ? value : value ? [value] : [];
    }

    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function toValues(value: AdaptiveSelectValue) {
    return Array.isArray(value) ? value : value ? [value] : [];
}

function getSearchText(option: AdaptiveSelectOption) {
    if (option.searchText) {
        return option.searchText;
    }

    if (typeof option.label === 'string' || typeof option.label === 'number') {
        return String(option.label);
    }

    return option.value;
}

function getTriggerLabel(
    selectedOptions: AdaptiveSelectOption[],
    selectedValues: string[],
    multiple: boolean,
    placeholder: ReactNode,
) {
    if (selectedValues.length === 0) {
        return placeholder;
    }

    if (!multiple) {
        return selectedOptions[0]?.label ?? selectedValues[0];
    }

    return selectedValues.length === 1
        ? (selectedOptions[0]?.label ?? selectedValues[0])
        : `${selectedValues.length} selected`;
}

export { AdaptiveSelect, type AdaptiveSelectProps };
