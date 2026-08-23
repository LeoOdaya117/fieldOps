import { Form } from '@inertiajs/react';
import { ListChecks, X } from 'lucide-react';
import type { ComponentProps, FormEventHandler, ReactNode } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BulkActionsProps = ComponentProps<'div'> & {
    selectedIds: Array<number | string>;
    onClear: () => void;
    children: ReactNode;
};

type BulkActionFormProps = {
    action: string;
    ids: Array<number | string>;
    method?: 'post' | 'put' | 'patch' | 'delete';
    onSubmit?: FormEventHandler<HTMLFormElement>;
    destructive?: boolean;
    children: ReactNode;
};

function BulkActions({
    selectedIds,
    onClear,
    className,
    children,
    ...props
}: BulkActionsProps) {
    if (selectedIds.length === 0) {
        return null;
    }

    return (
        <div
            data-slot="bulk-actions"
            className={cn('flex items-center gap-2', className)}
            {...props}
        >
            <Badge variant="secondary" className="h-8 rounded-md px-2.5">
                {selectedIds.length} selected
            </Badge>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                        <ListChecks />
                        Bulk actions
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-56"
                >
                    <DropdownMenuLabel>Selected rows</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {children}
                </DropdownMenuContent>
            </DropdownMenu>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Clear selected rows"
                onClick={onClear}
            >
                <X />
            </Button>
        </div>
    );
}

function BulkActionForm({
    action,
    ids,
    method = 'post',
    onSubmit,
    destructive = false,
    children,
}: BulkActionFormProps) {
    return (
        <Form action={action} method={method} onSubmit={onSubmit}>
            {ids.map((id) => (
                <input key={id} type="hidden" name="ids[]" value={id} />
            ))}
            <DropdownMenuItem
                asChild
                className={cn(
                    destructive &&
                        'text-destructive focus:bg-destructive/10 focus:text-destructive',
                )}
            >
                <button type="submit" className="w-full text-left">
                    {children}
                </button>
            </DropdownMenuItem>
        </Form>
    );
}

export { BulkActionForm, BulkActions };
