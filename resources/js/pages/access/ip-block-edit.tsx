import { Form, Head } from '@inertiajs/react';
import {
    ArrowLeft,
    CircleCheck,
    CircleSlash2,
    Clock3,
    GlobeLock,
    History,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BlockedIpAddress } from '@/features/access/ip-block-table-model';
import { dashboard } from '@/routes';
import {
    activate as activateIpBlock,
    create as createIpBlock,
    deactivate as deactivateIpBlock,
    index as ipBlocksIndex,
    store as storeIpBlock,
    update as updateIpBlock,
} from '@/routes/access/ip-blocks';

type Props = {
    blockedIpAddress: BlockedIpAddress | null;
};

function formatDate(value: string | null): string {
    return value ? new Date(value).toLocaleString() : 'Not recorded';
}

export default function IpBlockEditPage({ blockedIpAddress }: Props) {
    const isEditing = blockedIpAddress !== null;
    const formAction = isEditing
        ? updateIpBlock.url(blockedIpAddress.id)
        : storeIpBlock.url();
    const formMethod = isEditing ? 'patch' : 'post';

    return (
        <>
            <Head title={isEditing ? 'Edit IP address' : 'Add IP address'} />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink
                    href={ipBlocksIndex.url()}
                    variant="ghost"
                    size="sm"
                >
                    <ArrowLeft />
                    Back to IP addresses
                </ActionLink>

                <Heading
                    title={isEditing ? 'Edit IP address' : 'Add IP address'}
                    description={
                        isEditing
                            ? 'Update the reason or change whether this address can access FieldOps.'
                            : 'Add an exact IPv4 or IPv6 address and apply its access rule.'
                    }
                />

                <div className="grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                    <Card className="overflow-hidden">
                        <CardHeader className="border-b border-border bg-muted/15 px-4 py-5 sm:px-6">
                            <div className="flex items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <GlobeLock className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <CardTitle>Address details</CardTitle>
                                    <CardDescription className="mt-1.5 max-w-xl leading-5">
                                        Login addresses are remembered
                                        automatically. Use this form to document
                                        the rule and control access.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <Form action={formAction} method={formMethod}>
                            {({ processing, errors }) => (
                                <>
                                    <CardContent className="space-y-7 p-4 sm:p-6">
                                        <div className="grid gap-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label htmlFor="ip-address">
                                                    IP address
                                                </Label>
                                                <span className="text-xs text-muted-foreground">
                                                    Exact match only
                                                </span>
                                            </div>
                                            <div className="relative">
                                                <GlobeLock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="ip-address"
                                                    name="ip_address"
                                                    className="h-11 pl-10 font-mono text-sm"
                                                    defaultValue={
                                                        blockedIpAddress?.ipAddress ??
                                                        ''
                                                    }
                                                    placeholder="203.0.113.10 or 2001:db8::1"
                                                    inputMode="text"
                                                    readOnly={isEditing}
                                                    aria-invalid={Boolean(
                                                        errors.ip_address,
                                                    )}
                                                    required={!isEditing}
                                                />
                                            </div>
                                            <p className="text-xs leading-5 text-muted-foreground">
                                                Enter one normalized IPv4 or
                                                IPv6 address. CIDR ranges are
                                                not supported.
                                            </p>
                                            {isEditing ? (
                                                <p className="text-xs leading-5 text-muted-foreground">
                                                    This address is locked after
                                                    it has been recorded.
                                                </p>
                                            ) : null}
                                            <InputError
                                                message={errors.ip_address}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label htmlFor="ip-reason">
                                                    Reason
                                                </Label>
                                                <span className="text-xs text-muted-foreground">
                                                    Optional
                                                </span>
                                            </div>
                                            <textarea
                                                id="ip-reason"
                                                name="reason"
                                                rows={4}
                                                defaultValue={
                                                    blockedIpAddress?.reason ??
                                                    ''
                                                }
                                                placeholder="Describe the access concern or incident behind this rule."
                                                aria-invalid={Boolean(
                                                    errors.reason,
                                                )}
                                                className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-5 text-foreground transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            />
                                            <p className="text-xs leading-5 text-muted-foreground">
                                                Keep this useful to the next
                                                administrator reviewing the
                                                audit history.
                                            </p>
                                            <InputError
                                                message={errors.reason}
                                            />
                                        </div>
                                    </CardContent>

                                    <CardFooter className="flex-col items-stretch gap-4 border-t border-border bg-muted/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                        <div className="flex max-w-md items-start gap-2.5 text-xs leading-5 text-muted-foreground">
                                            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
                                            <p>
                                                <span className="font-medium text-foreground">
                                                    Security check:
                                                </span>{' '}
                                                changes require password
                                                confirmation and are recorded in
                                                the access audit history.
                                            </p>
                                        </div>
                                        <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                                            <ActionLink
                                                href={ipBlocksIndex.url()}
                                                variant="ghost"
                                            >
                                                Cancel
                                            </ActionLink>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                            >
                                                {isEditing
                                                    ? 'Save changes'
                                                    : 'Block'}
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </>
                            )}
                        </Form>
                    </Card>

                    {blockedIpAddress ? (
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <CardTitle>Rule summary</CardTitle>
                                        <CardDescription className="mt-1.5">
                                            Access takes effect on the next
                                            request.
                                        </CardDescription>
                                    </div>
                                    <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="rounded-xl border border-border bg-muted/20 p-4">
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`flex size-9 items-center justify-center rounded-lg ${blockedIpAddress.isActive ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}
                                        >
                                            {blockedIpAddress.isActive ? (
                                                <CircleSlash2 aria-hidden="true" />
                                            ) : (
                                                <CircleCheck aria-hidden="true" />
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold">
                                                {blockedIpAddress.isActive
                                                    ? 'Requests are blocked'
                                                    : 'Requests are allowed'}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {blockedIpAddress.isActive
                                                    ? 'This address cannot reach FieldOps.'
                                                    : 'This address can reach FieldOps.'}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                blockedIpAddress.isActive
                                                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                                    : 'border-success/30 bg-success/10 text-success'
                                            }
                                        >
                                            {blockedIpAddress.isActive
                                                ? 'Blocked'
                                                : 'Allowed'}
                                        </Badge>
                                    </div>
                                </div>

                                <dl className="grid gap-3 text-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-muted-foreground">
                                            First seen
                                        </dt>
                                        <dd className="text-right font-medium">
                                            {formatDate(
                                                blockedIpAddress.firstSeenAt,
                                            )}
                                        </dd>
                                    </div>
                                    <div className="flex items-start justify-between gap-4">
                                        <dt className="text-muted-foreground">
                                            Last seen
                                        </dt>
                                        <dd className="text-right font-medium">
                                            {formatDate(
                                                blockedIpAddress.lastSeenAt,
                                            )}
                                        </dd>
                                    </div>
                                </dl>

                                <Form
                                    action={
                                        blockedIpAddress.isActive
                                            ? deactivateIpBlock.url(
                                                  blockedIpAddress.id,
                                              )
                                            : activateIpBlock.url(
                                                  blockedIpAddress.id,
                                              )
                                    }
                                    method="patch"
                                >
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            variant={
                                                blockedIpAddress.isActive
                                                    ? 'outline'
                                                    : 'destructive'
                                            }
                                            className="w-full"
                                            disabled={processing}
                                        >
                                            {blockedIpAddress.isActive
                                                ? 'Allow'
                                                : 'Block'}
                                        </Button>
                                    )}
                                </Form>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <div className="flex items-start gap-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <ShieldCheck className="size-4" />
                                    </span>
                                    <div>
                                        <CardTitle>What happens next</CardTitle>
                                        <CardDescription className="mt-1.5 leading-5">
                                            Saving this form blocks the address
                                            immediately after confirmation.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-start gap-2.5 text-xs leading-5 text-muted-foreground">
                                    <History className="mt-0.5 size-4 shrink-0 text-primary" />
                                    <p>
                                        The address will remain in the directory
                                        with its first and last seen times for
                                        future review.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}

IpBlockEditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'IP addresses', href: ipBlocksIndex.url() },
        { title: 'Edit IP address', href: createIpBlock.url() },
    ],
};
