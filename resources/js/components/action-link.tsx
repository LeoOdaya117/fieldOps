import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActionLinkProps = Omit<ComponentProps<typeof Link>, 'size'> & {
    variant?: VariantProps<typeof buttonVariants>['variant'];
    size?: VariantProps<typeof buttonVariants>['size'];
};

function ActionLink({ className, variant, size, ...props }: ActionLinkProps) {
    return (
        <Link
            data-slot="action-link"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { ActionLink };
