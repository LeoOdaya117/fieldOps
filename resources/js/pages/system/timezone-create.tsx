import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import ReferenceDataForm from '@/features/system/components/reference-data-form';
import { dashboard } from '@/routes';
import {
    index as timezonesIndex,
    store as storeTimezone,
} from '@/routes/system/timezones';

export default function TimezoneCreatePage() {
    return (
        <>
            <Head title="Create timezone" />
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
                    title="Create timezone"
                    description="Add a valid IANA timezone to the FieldOps system directory."
                />
                <ReferenceDataForm
                    resource="timezone"
                    action={storeTimezone.url()}
                    method="post"
                    submitLabel="Create timezone"
                    cancelHref={timezonesIndex.url()}
                />
            </div>
        </>
    );
}

TimezoneCreatePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Timezones', href: timezonesIndex() },
        { title: 'Create timezone', href: timezonesIndex() },
    ],
};
