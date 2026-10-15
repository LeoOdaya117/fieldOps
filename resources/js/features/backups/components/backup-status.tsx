import { CheckCircle2, TriangleAlert } from 'lucide-react';
import type { BackupCommonProps } from '../types';

export function BackupStatus({
    busy,
    notice,
    operations,
}: Pick<BackupCommonProps, 'busy' | 'operations'> & { notice: string | null }) {
    return (
        <div className="space-y-3">
            {notice && (
                <p
                    role="alert"
                    className="rounded-md border border-border bg-muted p-4 text-sm leading-6"
                >
                    {notice}
                </p>
            )}
            {busy && !notice && (
                <p role="status" className="text-sm text-muted-foreground">
                    A backup or restore is queued or running. Status updates
                    automatically.
                </p>
            )}
            {operations
                .filter((operation) => operation.error)
                .slice(0, 3)
                .map((operation) => (
                    <p
                        key={operation.id}
                        role="alert"
                        className="text-sm text-destructive"
                    >
                        {operation.error}
                        {operation.safety_backup_id && (
                            <span className="block break-all text-muted-foreground">
                                Safety backup: {operation.safety_backup_id}
                            </span>
                        )}
                    </p>
                ))}
        </div>
    );
}

export function BackupReadiness({
    prerequisites,
}: Pick<BackupCommonProps, 'prerequisites'>) {
    const ready =
        prerequisites.length > 0 && prerequisites.every((item) => item.ready);

    return (
        <details
            className="rounded-lg border border-border bg-card p-4 text-sm"
            open={!ready}
        >
            <summary className="cursor-pointer font-medium focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring">
                {ready
                    ? 'Backup prerequisites are ready'
                    : 'Complete backup setup before continuing'}
            </summary>
            <ul className="mt-4 space-y-3">
                {prerequisites.map((item) => (
                    <li key={item.label} className="flex items-start gap-3">
                        {item.ready ? (
                            <CheckCircle2
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-success"
                            />
                        ) : (
                            <TriangleAlert
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-warning"
                            />
                        )}
                        <div>
                            <span className="font-medium">
                                {item.label}:{' '}
                                {item.ready ? 'Ready' : 'Action needed'}
                            </span>
                            <p className="mt-1 text-muted-foreground">
                                {item.message}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
            {prerequisites.length === 0 && (
                <p className="mt-3 text-muted-foreground">
                    Readiness checks are unavailable. Refresh before starting an
                    operation.
                </p>
            )}
            <p className="mt-4 leading-6 text-muted-foreground">
                Pause schema changes during backup. Before restore, a server
                operator must stop workers, scheduled tasks, and external
                database writers.
            </p>
        </details>
    );
}
