import { Form, Head } from '@inertiajs/react';
import { Building2, ListFilter, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Props = {
    settings: {
        name: string;
        timezone: string;
        pagination_size: string;
        idle_timeout_seconds: string;
        login_max_attempts: string;
        login_decay_minutes: string;
    };
    timezones: string[];
    paginationOptions: number[];
    maximumIdleTimeoutSeconds: number;
};

function SectionTitle({
    icon: Icon,
    title,
    description,
}: {
    icon: typeof Building2;
    title: string;
    description: string;
}) {
    return (
        <div className="mb-5 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>
        </div>
    );
}

export default function SystemSettings({
    settings,
    timezones,
    paginationOptions,
    maximumIdleTimeoutSeconds = 7200,
}: Props) {
    const [timezone, setTimezone] = useState(settings.timezone);
    const [paginationSize, setPaginationSize] = useState(
        settings.pagination_size,
    );

    return (
        <>
            <Head title="General settings" />
            <div className="settings-workspace max-w-4xl overflow-hidden border border-border bg-card text-card-foreground">
                <Form
                    action="/settings/system"
                    method="patch"
                    options={{ preserveScroll: true }}
                >
                    {({ errors, processing }) => (
                        <>
                            <section className="settings-section">
                                <SectionTitle
                                    icon={Building2}
                                    title="Organization"
                                    description="The name and time zone shown across the application."
                                />
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="system-name">
                                            System name
                                        </Label>
                                        <Input
                                            id="system-name"
                                            name="name"
                                            defaultValue={settings.name}
                                            aria-invalid={Boolean(errors.name)}
                                            aria-describedby={
                                                errors.name
                                                    ? 'system-name-error'
                                                    : undefined
                                            }
                                            required
                                        />
                                        <InputError
                                            id="system-name-error"
                                            message={errors.name}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="system-timezone">
                                            Time zone
                                        </Label>
                                        <input
                                            type="hidden"
                                            name="timezone"
                                            value={timezone}
                                        />
                                        <Select
                                            value={timezone}
                                            onValueChange={setTimezone}
                                            required
                                        >
                                            <SelectTrigger
                                                id="system-timezone"
                                                className="min-h-11 w-full bg-background"
                                                aria-invalid={Boolean(
                                                    errors.timezone,
                                                )}
                                                aria-describedby={
                                                    errors.timezone
                                                        ? 'system-timezone-error'
                                                        : undefined
                                                }
                                            >
                                                <SelectValue placeholder="Choose a time zone" />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                align="start"
                                                className="max-h-80"
                                            >
                                                {timezones.map((option) => (
                                                    <SelectItem
                                                        key={option}
                                                        value={option}
                                                    >
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            id="system-timezone-error"
                                            message={errors.timezone}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="settings-section border-t border-border">
                                <SectionTitle
                                    icon={ListFilter}
                                    title="Defaults"
                                    description="Everyday list and session behavior."
                                />
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="pagination-size">
                                            Rows per page
                                        </Label>
                                        <input
                                            type="hidden"
                                            name="pagination_size"
                                            value={paginationSize}
                                        />
                                        <Select
                                            value={paginationSize}
                                            onValueChange={setPaginationSize}
                                            required
                                        >
                                            <SelectTrigger
                                                id="pagination-size"
                                                className="min-h-11 w-full bg-background"
                                                aria-invalid={Boolean(
                                                    errors.pagination_size,
                                                )}
                                                aria-describedby={
                                                    errors.pagination_size
                                                        ? 'pagination-size-error'
                                                        : undefined
                                                }
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                align="start"
                                            >
                                                {paginationOptions.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option}
                                                            value={String(
                                                                option,
                                                            )}
                                                        >
                                                            {option} rows
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            id="pagination-size-error"
                                            message={errors.pagination_size}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="idle-timeout">
                                            Log out after inactivity
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="idle-timeout"
                                                name="idle_timeout_seconds"
                                                type="number"
                                                min={60}
                                                max={maximumIdleTimeoutSeconds}
                                                defaultValue={
                                                    settings.idle_timeout_seconds
                                                }
                                                className="pr-20 tabular-nums"
                                                aria-invalid={Boolean(
                                                    errors.idle_timeout_seconds,
                                                )}
                                                aria-describedby={
                                                    errors.idle_timeout_seconds
                                                        ? 'idle-timeout-error'
                                                        : 'idle-timeout-help'
                                                }
                                                required
                                            />
                                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                                                seconds
                                            </span>
                                        </div>
                                        <p
                                            id="idle-timeout-help"
                                            className="text-xs text-muted-foreground"
                                        >
                                            900 seconds is 15 minutes.
                                        </p>
                                        <InputError
                                            id="idle-timeout-error"
                                            message={
                                                errors.idle_timeout_seconds
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="settings-section border-t border-border">
                                <SectionTitle
                                    icon={ShieldCheck}
                                    title="Sign-in protection"
                                    description="Set the failed password-attempt policy."
                                />
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="login-max-attempts">
                                            Failed attempts allowed
                                        </Label>
                                        <Input
                                            id="login-max-attempts"
                                            name="login_max_attempts"
                                            type="number"
                                            min={1}
                                            max={20}
                                            defaultValue={
                                                settings.login_max_attempts
                                            }
                                            className="tabular-nums"
                                            aria-invalid={Boolean(
                                                errors.login_max_attempts,
                                            )}
                                            aria-describedby={
                                                errors.login_max_attempts
                                                    ? 'login-max-attempts-error'
                                                    : undefined
                                            }
                                            required
                                        />
                                        <InputError
                                            id="login-max-attempts-error"
                                            message={errors.login_max_attempts}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="login-decay-minutes">
                                            Reset attempts after
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="login-decay-minutes"
                                                name="login_decay_minutes"
                                                type="number"
                                                min={1}
                                                max={1440}
                                                defaultValue={
                                                    settings.login_decay_minutes
                                                }
                                                className="pr-20 tabular-nums"
                                                aria-invalid={Boolean(
                                                    errors.login_decay_minutes,
                                                )}
                                                aria-describedby={
                                                    errors.login_decay_minutes
                                                        ? 'login-decay-minutes-error'
                                                        : undefined
                                                }
                                                required
                                            />
                                            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                                                minutes
                                            </span>
                                        </div>
                                        <InputError
                                            id="login-decay-minutes-error"
                                            message={errors.login_decay_minutes}
                                        />
                                    </div>
                                </div>
                            </section>

                            <footer className="flex justify-end border-t border-border bg-muted/35 px-5 py-4 sm:px-7">
                                <Button disabled={processing}>
                                    {processing ? 'Saving…' : 'Save changes'}
                                </Button>
                            </footer>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

SystemSettings.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'System settings', href: '/settings/system' },
    ],
};
