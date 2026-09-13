import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import ReferenceDataForm from '@/features/system/components/reference-data-form';
import type { Timezone } from '@/features/system/types';
import { dashboard } from '@/routes';
import {
    index as timezonesIndex,
    update as updateTimezone,
} from '@/routes/system/timezones';

export default function TimezoneEditPage({ timezone }: { timezone: Timezone }) {
    return (
        <>
            <Head title={`Edit ${timezone.name}`} />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink
                    href={timezonesIndex.url()}
                    variant="ghost"
                    size="sm"
                >
                    <ArrowLeft />
                    Back to timezones
                </ActionLink>
                <Heading
                    title={`Edit ${timezone.name}`}
                    description="Update the IANA timezone identifier."
                />
                <ReferenceDataForm
                    resource="timezone"
                    action={updateTimezone.url(timezone.id)}
                    method="patch"
                    initialName={timezone.name}
                    submitLabel="Save changes"
                    cancelHref={timezonesIndex.url()}
                />
            </div>
        </>
    );
}

TimezoneEditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Timezones', href: timezonesIndex() },
        { title: 'Edit timezone', href: timezonesIndex() },
    ],
};
