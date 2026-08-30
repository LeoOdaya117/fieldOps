import { Form, Head } from '@inertiajs/react';
import { Building2, ListFilter } from 'lucide-react';
import type { ReactNode } from 'react';
import SystemSettingsController from '@/actions/App/Http/Controllers/Settings/SystemSettingsController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import { edit as editSystemSettings } from '@/routes/system-settings';

type SystemSettingsPageProps = {
    settings: {
        name: string;
        timezone: string;
        pagination_size: string;
    };
    timezones: string[];
    paginationOptions: number[];
};

function SettingHeading({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-link/10 text-link">
                {icon}
            </span>
            <div className="min-w-0">
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
}: SystemSettingsPageProps) {
    return (
        <>
            <Head title="System settings" />

            <h1 className="sr-only">System settings</h1>

            <div className="space-y-6">
                <Form
                    {...SystemSettingsController.update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ errors, processing }) => (
                        <>
                            <Card>
                                <CardHeader>
                                    <SettingHeading
                                        icon={<Building2 className="size-4" />}
                                        title="Organization"
                                        description="Set the name and time zone used throughout FieldOps."
                                    />
                                </CardHeader>
                                <CardContent className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="system-name">
                                            System name
                                        </Label>
                                        <Input
                                            id="system-name"
                                            name="name"
                                            defaultValue={settings.name}
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Shown in the application header and
                                            browser context.
                                        </p>
                                        <InputError message={errors.name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="system-timezone">
                                            Time zone
                                        </Label>
                                        <select
                                            id="system-timezone"
                                            name="timezone"
                                            defaultValue={settings.timezone}
                                            required
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            {timezones.map((timezone) => (
                                                <option
                                                    key={timezone}
                                                    value={timezone}
                                                >
                                                    {timezone}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground">
                                            Used for server-side dates and
                                            scheduled activity.
                                        </p>
                                        <InputError message={errors.timezone} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <SettingHeading
                                        icon={<ListFilter className="size-4" />}
                                        title="List defaults"
                                        description="Choose the default number of records shown in paginated tables."
                                    />
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-2">
                                        <Label htmlFor="pagination-size">
                                            Default rows per page
                                        </Label>
                                        <select
                                            id="pagination-size"
                                            name="pagination_size"
                                            defaultValue={
                                                settings.pagination_size
                                            }
                                            required
                                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            {paginationOptions.map((option) => (
                                                <option
                                                    key={option}
                                                    value={option}
                                                >
                                                    {option} rows
                                                </option>
                                            ))}
                                        </select>
                                        <InputError
                                            message={errors.pagination_size}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-center gap-4">
                                <Button disabled={processing}>
                                    Save system settings
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

SystemSettings.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'System settings', href: editSystemSettings() },
    ],
};
