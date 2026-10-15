import { Form, Link, router } from '@inertiajs/react';
import { Settings2 } from 'lucide-react';
import {
    createContext,
    useContext,
    useRef,
    useState,
} from 'react';
import type {
    ComponentProps,
    FormEventHandler,
    ReactNode,
} from 'react';
import type { FormComponentRef } from '@inertiajs/core';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ConfirmationOptions } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

type TableActionsProps = ComponentProps<'div'> & {
    label?: string;
};

type TableActionFormProps = {
    action: string;
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
    onSubmit?: FormEventHandler<HTMLFormElement>;
    destructive?: boolean;
    confirmation?: ConfirmationOptions;
    children: ReactNode;
};

type TableActionLinkProps = ComponentProps<typeof Link> & {
    confirmation?: ConfirmationOptions;
};

type ConfirmationRequest = (
    options: ConfirmationOptions,
    onConfirm: () => void,
    destructive: boolean,
) => void;

type TableActionsContextValue = {
    requestConfirmation: ConfirmationRequest;
};

const TableActionsContext = createContext<TableActionsContextValue | null>(
    null,
);

function TableActions({
    className,
    label = 'Row actions',
    children,
    ...props
}: TableActionsProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [pendingConfirmation, setPendingConfirmation] = useState<{
        options: ConfirmationOptions;
        onConfirm: () => void;
        destructive: boolean;
    } | null>(null);

    return (
        <TableActionsContext.Provider
            value={{
                requestConfirmation: (options, onConfirm, destructive) => {
                    setPendingConfirmation({
                        options,
                        onConfirm,
                        destructive,
                    });
                },
            }}
        >
            <div
                data-slot="table-actions"
                className={cn('flex items-center justify-end', className)}
                {...props}
            >
                <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={label}
                            className="size-8"
                        >
                            <Settings2 />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="max-h-80 w-48 overflow-y-auto"
                    >
                        {children}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <ConfirmDialog
                open={pendingConfirmation !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingConfirmation(null);
                    }
                }}
                options={pendingConfirmation?.options}
                destructive={pendingConfirmation?.destructive}
                onConfirm={() => {
                    const action = pendingConfirmation?.onConfirm;
                    setPendingConfirmation(null);
                    setMenuOpen(false);
                    action?.();
                }}
            />
        </TableActionsContext.Provider>
    );
}

function TableActionLink({
    className,
    confirmation,
    href,
    ...props
}: TableActionLinkProps) {
    const context = useContext(TableActionsContext);
    const [localConfirmationOpen, setLocalConfirmationOpen] = useState(false);

    const handleSelect = (event: Event) => {
        if (!confirmation) {
            return;
        }

        event.preventDefault();
        const onConfirm = () => router.visit(String(href));

        if (context) {
            context.requestConfirmation(confirmation, onConfirm, false);
        } else {
            setLocalConfirmationOpen(true);
        }
    };

    return (
        <>
            <DropdownMenuItem asChild onSelect={handleSelect}>
                <Link
                    {...props}
                    href={href}
                    className={cn(
                        'flex w-full items-center gap-2',
                        className,
                    )}
                />
            </DropdownMenuItem>
            {!context && confirmation && (
                <ConfirmDialog
                    open={localConfirmationOpen}
                    onOpenChange={setLocalConfirmationOpen}
                    options={confirmation}
                    onConfirm={() => router.visit(String(href))}
                />
            )}
        </>
    );
}

function TableActionForm({
    action,
    method = 'post',
    onSubmit,
    destructive = false,
    confirmation,
    children,
}: TableActionFormProps) {
    const context = useContext(TableActionsContext);
    const formRef = useRef<FormComponentRef>(null);
    const [localConfirmationOpen, setLocalConfirmationOpen] = useState(false);

    const handleSelect = (event: Event) => {
        if (!confirmation) {
            return;
        }

        event.preventDefault();
        const onConfirm = () => formRef.current?.submit();

        if (context) {
            context.requestConfirmation(confirmation, onConfirm, destructive);
        } else {
            setLocalConfirmationOpen(true);
        }
    };

    return (
        <>
            <Form
                ref={formRef}
                action={action}
                method={method}
                onSubmit={onSubmit}
            >
                <DropdownMenuItem
                    asChild
                    onSelect={handleSelect}
                    className={cn(
                        destructive &&
                            'text-destructive focus:bg-destructive/10 focus:text-destructive',
                    )}
                >
                    <button
                        type={confirmation ? 'button' : 'submit'}
                        className="w-full text-left"
                    >
                        {children}
                    </button>
                </DropdownMenuItem>
            </Form>
            {!context && confirmation && (
                <ConfirmDialog
                    open={localConfirmationOpen}
                    onOpenChange={setLocalConfirmationOpen}
                    options={confirmation}
                    destructive={destructive}
                    onConfirm={() => formRef.current?.submit()}
                />
            )}
        </>
    );
}

export { TableActionForm, TableActionLink, TableActions };
