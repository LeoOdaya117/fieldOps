import { Form, Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { FormComponentRef } from '@inertiajs/core';
import { useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ActionLink } from '@/components/action-link';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ConfirmationOptions } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DetailsPageProps = {
    title: string;
    description?: string;
    backHref: string;
    backLabel: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
};

type DetailsActionFormProps = Omit<
    ComponentProps<typeof Button>,
    'children' | 'type' | 'onClick'
> & {
    action: string;
    method?: 'post' | 'put' | 'patch' | 'delete';
    children: ReactNode;
    confirmation?: ConfirmationOptions;
    destructive?: boolean;
};

function DetailsPage({
    title,
    description,
    backHref,
    backLabel,
    actions,
    children,
    className,
}: DetailsPageProps) {
    return (
        <>
            <Head title={title} />
            <div
                data-slot="details-page"
                className={cn(
                    'space-y-6 px-4 pt-0 pb-4 sm:px-6 sm:pt-0 sm:pb-6 lg:px-8 lg:pt-0 lg:pb-8',
                    className,
                )}
            >
                <div
                    data-slot="details-toolbar"
                    className="sticky top-0 z-20 -mx-4 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <ActionLink
                                href={backHref}
                                variant="ghost"
                                size="sm"
                                className="shrink-0"
                            >
                                <ArrowLeft />
                                {backLabel}
                            </ActionLink>
                            <span
                                aria-hidden="true"
                                className="hidden h-5 w-px bg-border sm:block"
                            />
                            <h1 className="truncate text-sm font-semibold text-foreground sm:text-base">
                                {title}
                            </h1>
                        </div>
                        {actions ? (
                            <div className="flex flex-wrap items-center justify-end gap-2 pl-11 sm:pl-0">
                                {actions}
                            </div>
                        ) : null}
                    </div>
                </div>
                {description ? (
                    <p className="max-w-3xl text-sm text-muted-foreground">
                        {description}
                    </p>
                ) : null}
                {children}
            </div>
        </>
    );
}

function DetailsActionForm({
    action,
    method = 'post',
    confirmation,
    destructive = false,
    children,
    ...buttonProps
}: DetailsActionFormProps) {
    const formRef = useRef<FormComponentRef>(null);
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const variant =
        buttonProps.variant ?? (destructive ? 'destructive' : 'default');

    return (
        <>
            <Form ref={formRef} action={action} method={method}>
                {({ processing }) => (
                    <Button
                        {...buttonProps}
                        type={confirmation ? 'button' : 'submit'}
                        variant={variant}
                        disabled={processing || buttonProps.disabled}
                        onClick={
                            confirmation
                                ? () => setConfirmationOpen(true)
                                : undefined
                        }
                    >
                        {children}
                    </Button>
                )}
            </Form>
            {confirmation ? (
                <ConfirmDialog
                    open={confirmationOpen}
                    onOpenChange={setConfirmationOpen}
                    options={confirmation}
                    destructive={destructive}
                    onConfirm={() => formRef.current?.submit()}
                />
            ) : null}
        </>
    );
}

export { DetailsActionForm, DetailsPage };
