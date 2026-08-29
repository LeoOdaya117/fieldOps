import { Form, Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { FormComponentRef } from '@inertiajs/core';
import { useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { ActionLink } from '@/components/action-link';
import { Card } from '@/components/ui/card';
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

type DetailsSectionProps = {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
};

type DetailFieldProps = {
    label: string;
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
                className={cn('space-y-6 p-4 sm:p-6 lg:p-8', className)}
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

function DetailsSection({
    title,
    description,
    children,
    className,
}: DetailsSectionProps) {
    return (
        <section className={cn('space-y-3', className)}>
            <div className="px-1">
                <h2 className="text-base font-semibold tracking-tight">
                    {title}
                </h2>
                {description ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>
            <Card className="overflow-hidden">{children}</Card>
        </section>
    );
}

function DetailField({ label, children, className }: DetailFieldProps) {
    return (
        <div className={cn('min-w-0', className)}>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="mt-1.5 min-w-0 text-sm text-foreground">
                {children}
            </dd>
        </div>
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

export { DetailField, DetailsActionForm, DetailsPage, DetailsSection };
