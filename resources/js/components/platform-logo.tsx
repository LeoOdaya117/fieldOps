import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

type PlatformLogoProps = {
    variant?: 'mark' | 'wordmark' | 'wordmark-on-dark';
    className?: string;
    markClassName?: string;
    showName?: boolean;
};

export function PlatformLogo({
    variant = 'mark',
    className,
    markClassName,
    showName = variant !== 'mark',
}: PlatformLogoProps) {
    const { system } = usePage().props;
    const slot =
        variant === 'mark'
            ? 'brand_mark'
            : variant === 'wordmark-on-dark'
              ? 'brand_wordmark_on_dark'
              : 'brand_wordmark';
    const branding = system?.branding?.[slot];
    const name = system?.name ?? 'FieldOps';

    if (branding?.is_custom) {
        return (
            <img
                src={branding.url}
                alt={name}
                className={cn(
                    'max-h-full max-w-full object-contain',
                    className,
                )}
            />
        );
    }

    return (
        <span className={cn('inline-flex items-center gap-2.5', className)}>
            <AppLogoIcon
                className={cn('size-8 shrink-0', markClassName)}
                aria-hidden="true"
            />
            {showName && (
                <span className="truncate font-bold tracking-[-0.025em]">
                    {name}
                </span>
            )}
        </span>
    );
}
