import { usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Info,
    TriangleAlert,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type FlashValue = string | string[] | null | undefined;

type FlashProps = {
    success?: FlashValue;
    error?: FlashValue;
    warning?: FlashValue;
    info?: FlashValue;
    message?: FlashValue;
};

type FlashPageProps = {
    flash?: FlashProps;
    errors?: Record<string, FlashValue>;
};

type AlertKind = 'success' | 'error' | 'warning' | 'info';
type AlertState = { kind: AlertKind; messages: string[] };

const alertMeta: Record<
    AlertKind,
    {
        title: string;
        Icon: typeof CheckCircle2;
        iconClassName: string;
        surfaceClassName: string;
    }
> = {
    success: {
        title: 'Success',
        Icon: CheckCircle2,
        iconClassName: 'bg-success/10 text-success',
        surfaceClassName: 'border-success/25',
    },
    error: {
        title: 'Error',
        Icon: AlertCircle,
        iconClassName: 'bg-destructive/10 text-destructive',
        surfaceClassName: 'border-destructive/25',
    },
    warning: {
        title: 'Warning',
        Icon: TriangleAlert,
        iconClassName: 'bg-warning/15 text-warning-foreground',
        surfaceClassName: 'border-warning/30',
    },
    info: {
        title: 'Information',
        Icon: Info,
        iconClassName: 'bg-info/10 text-info-foreground',
        surfaceClassName: 'border-info/25',
    },
};

function toMessages(value: FlashValue): string[] {
    if (Array.isArray(value)) {
        return value.filter((message): message is string => Boolean(message));
    }

    return value ? [value] : [];
}

function resolveAlert(
    flash: FlashProps,
    errors: Record<string, FlashValue>,
): AlertState | null {
    const flashPriority: Array<[AlertKind, FlashValue]> = [
        ['error', flash.error],
        ['success', flash.success],
        ['warning', flash.warning],
        ['info', flash.info ?? flash.message],
    ];

    for (const [kind, value] of flashPriority) {
        const messages = toMessages(value);

        if (messages.length > 0) {
            return { kind, messages };
        }
    }

    const validationMessages = Object.values(errors).flatMap(toMessages);

    return validationMessages.length > 0
        ? { kind: 'error', messages: validationMessages }
        : null;
}

export function FlashAlert() {
    const { flash = {}, errors = {} } = usePage<FlashPageProps>().props;
    const [dismissedKey, setDismissedKey] = useState<string | null>(null);
    const alert = resolveAlert(flash, errors);
    const alertKey = alert ? `${alert.kind}:${alert.messages.join('|')}` : null;

    useEffect(() => {
        if (!alertKey) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setDismissedKey(alertKey);
        }, 8000);

        return () => window.clearTimeout(timeout);
    }, [alertKey]);

    if (!alert || dismissedKey === alertKey) {
        return null;
    }

    const { Icon, title, iconClassName, surfaceClassName } =
        alertMeta[alert.kind];

    return (
        <div className="pointer-events-none fixed top-4 right-4 left-4 z-[60] flex justify-end sm:top-5 sm:right-6 sm:left-auto sm:w-[min(25rem,calc(100vw-3rem))]">
            <div
                role="alert"
                aria-live="polite"
                className={cn(
                    'pointer-events-auto relative flex w-full animate-in overflow-hidden rounded-xl border bg-card shadow-lg shadow-foreground/5 fade-in-0 slide-in-from-top-2',
                    surfaceClassName,
                )}
            >
                <span
                    className={cn(
                        'flex w-10 shrink-0 items-center justify-center self-stretch',
                        iconClassName,
                    )}
                    aria-hidden="true"
                >
                    <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5 px-3.5 py-3 pr-10">
                    <p className="text-sm leading-5 font-semibold text-foreground">
                        {title}
                    </p>
                    {alert.messages.length === 1 ? (
                        <p className="text-sm leading-5 text-muted-foreground">
                            {alert.messages[0]}
                        </p>
                    ) : (
                        <ul className="list-disc space-y-1 pl-4 text-sm leading-5 text-muted-foreground">
                            {Array.from(new Set(alert.messages)).map(
                                (message) => (
                                    <li key={message}>{message}</li>
                                ),
                            )}
                        </ul>
                    )}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 size-7 text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss alert"
                    onClick={() => setDismissedKey(alertKey)}
                >
                    <X className="size-4" />
                </Button>
            </div>
        </div>
    );
}
