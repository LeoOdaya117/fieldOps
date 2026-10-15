import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type FormSelectOption = {
    value: string;
    label: ReactNode;
    disabled?: boolean;
};

type FormSelectProps = Omit<
    ComponentProps<typeof SelectTrigger>,
    'children' | 'value' | 'defaultValue' | 'onValueChange'
> & {
    name?: string;
    options: readonly FormSelectOption[];
    value?: string;
    defaultValue?: string;
    placeholder?: ReactNode;
    onValueChange?: (value: string) => void;
    required?: boolean;
};

function FormSelect({
    name,
    options,
    value,
    defaultValue = '',
    placeholder,
    onValueChange,
    required = false,
    disabled,
    className,
    ...triggerProps
}: FormSelectProps) {
    const emptyOption = options.find((option) => option.value === '');
    const selectableOptions = options.filter((option) => option.value !== '');
    const [selectedValue, setSelectedValue] = useState(
        value ?? defaultValue,
    );
    const currentValue = value ?? selectedValue;

    const handleValueChange = (nextValue: string) => {
        if (value === undefined) {
            setSelectedValue(nextValue);
        }

        onValueChange?.(nextValue);
    };

    return (
        <>
            {name ? (
                <input type="hidden" name={name} value={currentValue} />
            ) : null}
            <Select
                value={currentValue}
                onValueChange={handleValueChange}
                required={required}
                disabled={disabled}
            >
                <SelectTrigger
                    {...triggerProps}
                    disabled={disabled}
                    className={cn('w-full', className)}
                >
                    <SelectValue
                        placeholder={placeholder ?? emptyOption?.label}
                    />
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
        </>
    );
}

export { FormSelect, type FormSelectProps };
