import { cn } from '@/lib/utils';

export default function Heading({
    title,
    description,
    variant = 'default',
    className,
}: {
    title: string;
    description?: string;
    variant?: 'default' | 'small';
    className?: string;
}) {
    return (
        <header
            className={cn(
                variant === 'small' ? '' : 'mb-8 space-y-0.5',
                className,
            )}
        >
            <h1
                className={
                    variant === 'small'
                        ? 'mb-0.5 text-base font-medium'
                        : 'text-xl font-semibold tracking-tight'
                }
            >
                {title}
            </h1>
            {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
            )}
        </header>
    );
}
