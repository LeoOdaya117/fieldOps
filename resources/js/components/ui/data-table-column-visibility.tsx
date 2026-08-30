import { ChevronDown, Columns3, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const STORAGE_PREFIX = 'fieldops:data-table-columns:';

export type DataTableColumnVisibilityColumn = {
    key: string;
    label: string;
};

export type DataTableColumnVisibilityOptions = {
    storageKey: string;
    defaultVisibleKeys?: readonly string[];
};

type UseDataTableColumnVisibilityOptions = {
    storageKey: string | null;
    columnKeys: readonly string[];
    defaultVisibleKeys?: readonly string[];
};

type DataTableColumnVisibilityState = {
    signature: string;
    visibleKeys: string[];
};

type DataTableColumnVisibilityProps = {
    columns: readonly DataTableColumnVisibilityColumn[];
    visibleKeys: readonly string[];
    defaultVisibleKeys: readonly string[];
    onVisibleKeysChange: (keys: readonly string[]) => void;
    onReset: () => void;
};

function storageKey(storageKey: string): string {
    return `${STORAGE_PREFIX}${storageKey}`;
}

function uniqueKeys(keys: readonly string[]): string[] {
    return [...new Set(keys)];
}

function normalizeKeys(
    keys: readonly string[],
    allowedKeys: readonly string[],
): string[] {
    const requestedKeys = new Set(keys);

    return allowedKeys.filter((key) => requestedKeys.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function readStoredVisibleKeys(
    storageKeyValue: string | null,
    columnKeys: readonly string[],
    defaultVisibleKeys: readonly string[],
): string[] {
    if (!storageKeyValue || typeof window === 'undefined') {
        return [...defaultVisibleKeys];
    }

    try {
        const rawValue = window.localStorage.getItem(
            storageKey(storageKeyValue),
        );

        if (!rawValue) {
            return [...defaultVisibleKeys];
        }

        const parsedValue: unknown = JSON.parse(rawValue);

        if (
            !isRecord(parsedValue) ||
            !Array.isArray(parsedValue.visibleKeys) ||
            !parsedValue.visibleKeys.every(
                (key): key is string => typeof key === 'string',
            )
        ) {
            return [...defaultVisibleKeys];
        }

        const normalizedKeys = normalizeKeys(
            parsedValue.visibleKeys,
            columnKeys,
        );

        return parsedValue.visibleKeys.length > 0 && normalizedKeys.length === 0
            ? [...defaultVisibleKeys]
            : normalizedKeys;
    } catch {
        return [...defaultVisibleKeys];
    }
}

function writeStoredVisibleKeys(
    storageKeyValue: string,
    visibleKeys: readonly string[],
): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            storageKey(storageKeyValue),
            JSON.stringify({ visibleKeys }),
        );
    } catch {
        // Browser storage can be unavailable in privacy-restricted contexts.
    }
}

export function useDataTableColumnVisibility({
    storageKey: storageKeyValue,
    columnKeys,
    defaultVisibleKeys,
}: UseDataTableColumnVisibilityOptions) {
    const normalizedColumnKeys = useMemo(
        () => uniqueKeys(columnKeys),
        [columnKeys],
    );
    const normalizedDefaultVisibleKeys = useMemo(
        () =>
            normalizeKeys(
                defaultVisibleKeys ?? normalizedColumnKeys,
                normalizedColumnKeys,
            ),
        [defaultVisibleKeys, normalizedColumnKeys],
    );
    const configurationSignature = JSON.stringify([
        storageKeyValue,
        normalizedColumnKeys,
        normalizedDefaultVisibleKeys,
    ]);
    const [state, setState] = useState<DataTableColumnVisibilityState>(() => ({
        signature: configurationSignature,
        visibleKeys: readStoredVisibleKeys(
            storageKeyValue,
            normalizedColumnKeys,
            normalizedDefaultVisibleKeys,
        ),
    }));

    const visibleKeys = useMemo(
        () =>
            state.signature === configurationSignature
                ? state.visibleKeys
                : readStoredVisibleKeys(
                      storageKeyValue,
                      normalizedColumnKeys,
                      normalizedDefaultVisibleKeys,
                  ),
        [
            configurationSignature,
            normalizedColumnKeys,
            normalizedDefaultVisibleKeys,
            state.signature,
            state.visibleKeys,
            storageKeyValue,
        ],
    );

    useEffect(() => {
        if (!storageKeyValue) {
            return;
        }

        writeStoredVisibleKeys(storageKeyValue, visibleKeys);
    }, [storageKeyValue, visibleKeys]);

    const setVisibleKeys = useCallback(
        (keys: readonly string[]) => {
            setState({
                signature: configurationSignature,
                visibleKeys: normalizeKeys(keys, normalizedColumnKeys),
            });
        },
        [configurationSignature, normalizedColumnKeys],
    );
    const reset = useCallback(() => {
        setVisibleKeys(normalizedDefaultVisibleKeys);
    }, [normalizedDefaultVisibleKeys, setVisibleKeys]);

    return {
        visibleKeys,
        defaultVisibleKeys: normalizedDefaultVisibleKeys,
        setVisibleKeys,
        reset,
    };
}

function haveSameKeys(
    leftKeys: readonly string[],
    rightKeys: readonly string[],
): boolean {
    if (leftKeys.length !== rightKeys.length) {
        return false;
    }

    const rightKeySet = new Set(rightKeys);

    return leftKeys.every((key) => rightKeySet.has(key));
}

export function DataTableColumnVisibility({
    columns,
    visibleKeys,
    defaultVisibleKeys,
    onVisibleKeysChange,
    onReset,
}: DataTableColumnVisibilityProps) {
    const visibleKeySet = useMemo(() => new Set(visibleKeys), [visibleKeys]);
    const visibleCount = columns.filter((column) =>
        visibleKeySet.has(column.key),
    ).length;
    const allColumnsVisible =
        columns.length > 0 && visibleCount === columns.length;
    const allColumnsHidden = visibleCount === 0;
    const checkAllState = allColumnsVisible
        ? true
        : allColumnsHidden
          ? false
          : 'indeterminate';
    const isAtDefault = haveSameKeys(visibleKeys, defaultVisibleKeys);

    const toggleColumn = (key: string, checked: boolean) => {
        const nextKeys = new Set(visibleKeys);

        if (checked) {
            nextKeys.add(key);
        } else {
            nextKeys.delete(key);
        }

        onVisibleKeysChange(
            columns
                .map((column) => column.key)
                .filter((columnKey) => nextKeys.has(columnKey)),
        );
    };

    const toggleAllColumns = (checked: boolean) => {
        onVisibleKeysChange(
            checked ? columns.map((column) => column.key) : [],
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    aria-label="Manage columns"
                >
                    <Columns3 aria-hidden="true" />
                    <span>Manage columns</span>
                    <ChevronDown aria-hidden="true" className="size-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="max-h-[min(70vh,32rem)] w-64 max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto p-2"
            >
                <DropdownMenuLabel className="px-2 text-xs tracking-[0.08em] text-muted-foreground uppercase">
                    Manage columns
                </DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                    checked={checkAllState}
                    aria-label="Check all columns"
                    onCheckedChange={toggleAllColumns}
                    onSelect={(event) => event.preventDefault()}
                >
                    Check all
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {columns.map((column) => (
                    <DropdownMenuCheckboxItem
                        key={column.key}
                        checked={visibleKeySet.has(column.key)}
                        onCheckedChange={(checked) =>
                            toggleColumn(column.key, checked)
                        }
                        onSelect={(event) => event.preventDefault()}
                    >
                        {column.label}
                    </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    disabled={isAtDefault}
                    onSelect={(event) => {
                        event.preventDefault();
                        onReset();
                    }}
                >
                    <RotateCcw aria-hidden="true" />
                    Reset to defaults
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
