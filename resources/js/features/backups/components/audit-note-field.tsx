import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';

export function AuditNoteField({
    id,
    value,
    onChange,
    error,
    disabled,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>
                Audit note{' '}
                <span className="font-normal text-muted-foreground">
                    (optional)
                </span>
            </Label>
            <textarea
                id={id}
                name="audit_note"
                rows={3}
                maxLength={1000}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                aria-describedby={`${id}-help ${id}-error`}
                aria-invalid={Boolean(error)}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
            />
            <p id={`${id}-help`} className="text-xs text-muted-foreground">
                Record the purpose of this operation. Up to 1,000 characters; do
                not include passwords or secrets.
            </p>
            <InputError id={`${id}-error`} message={error} />
        </div>
    );
}
