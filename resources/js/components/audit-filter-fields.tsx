import { DateRangePicker } from '@/components/ui/date-range-picker';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuditTableFilters } from '@/types/audit';

type AuditFilterFieldsProps = {
    filters: AuditTableFilters;
    idPrefix: string;
    namePrefix?: string;
    createdFromName?: string;
    createdToName?: string;
    createdDateLabel?: string;
    includeActors?: boolean;
    includeRecordStatus?: boolean;
};

function AuditFilterFields({
    filters,
    idPrefix,
    namePrefix = '',
    createdFromName,
    createdToName,
    createdDateLabel = 'Created date range',
    includeActors = true,
    includeRecordStatus = true,
}: AuditFilterFieldsProps) {
    const fieldName = (name: string) => `${namePrefix}${name}`;
    const fieldId = (name: string) => `${idPrefix}-${name}`;

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor={fieldId('created-date-range')}>
                    {createdDateLabel}
                </Label>
                <DateRangePicker
                    id={fieldId('created-date-range')}
                    from={filters.createdFrom ?? filters.from}
                    to={filters.createdTo ?? filters.to}
                    fromName={createdFromName ?? fieldName('from')}
                    toName={createdToName ?? fieldName('to')}
                    label={createdDateLabel}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor={fieldId('updated-date-range')}>
                    Updated date range
                </Label>
                <DateRangePicker
                    id={fieldId('updated-date-range')}
                    from={filters.updatedFrom}
                    to={filters.updatedTo}
                    fromName={fieldName('updated_from')}
                    toName={fieldName('updated_to')}
                    label="Updated date range"
                />
            </div>
            {includeActors ? (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor={fieldId('created-by')}>
                            Created by
                        </Label>
                        <Input
                            id={fieldId('created-by')}
                            name={fieldName('created_by')}
                            defaultValue={filters.createdBy}
                            placeholder="Name or email"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={fieldId('updated-by')}>
                            Updated by
                        </Label>
                        <Input
                            id={fieldId('updated-by')}
                            name={fieldName('updated_by')}
                            defaultValue={filters.updatedBy}
                            placeholder="Name or email"
                        />
                    </div>
                </>
            ) : null}
            {includeRecordStatus ? (
                <div className="grid gap-2">
                    <Label htmlFor={fieldId('record-status')}>
                        Record status
                    </Label>
                    <AdaptiveSelect
                        id={fieldId('record-status')}
                        name={fieldName('record_status')}
                        multiple
                        defaultValue={filters.recordStatus}
                        aria-label="Record status"
                        placeholder="Active records"
                        options={[
                            { value: '', label: 'All record statuses' },
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Deleted' },
                        ]}
                    />
                </div>
            ) : null}
        </div>
    );
}

export { AuditFilterFields, type AuditFilterFieldsProps };
