import { Label } from '@/components/ui/label';

type RecordStatusFiltersProps = {
    canViewDeleted: boolean;
    value?: string | string[];
};

export function RecordStatusFilters({
    canViewDeleted,
    value,
}: RecordStatusFiltersProps) {
    if (!canViewDeleted) {
        return null;
    }

    const selected =
        value === undefined
            ? ['active']
            : Array.isArray(value)
              ? value
              : [value];

    return (
        <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Record status</legend>
            {(['active', 'inactive'] as const).map((status) => (
                <div
                    key={status}
                    className="flex min-h-9 items-center gap-2 text-sm"
                >
                    <input
                        id={`record-status-${status}`}
                        type="checkbox"
                        name="record_status[]"
                        value={status}
                        defaultChecked={selected.includes(status)}
                        className="size-4 rounded border-input accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    />
                    <Label
                        htmlFor={`record-status-${status}`}
                        className="cursor-pointer font-normal"
                    >
                        {status === 'active' ? 'Active' : 'Inactive'}
                    </Label>
                </div>
            ))}
        </fieldset>
    );
}
