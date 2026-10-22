import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export function AppearanceToggleButton({ className }: { className?: string }) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Dark mode"
            aria-pressed={isDark}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();

                updateAppearance(isDark ? 'light' : 'dark', {
                    x: bounds.left + bounds.width / 2,
                    y: bounds.top + bounds.height / 2,
                });
            }}
            className={cn('size-10 shrink-0', className)}
        >
            {isDark ? (
                <Sun aria-hidden="true" className="size-4" />
            ) : (
                <Moon aria-hidden="true" className="size-4" />
            )}
        </Button>
    );
}
