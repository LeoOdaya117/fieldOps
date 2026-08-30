import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import ReferenceDataForm from '@/features/system/components/reference-data-form';
import { dashboard } from '@/routes';
import {
    index as countriesIndex,
    store as storeCountry,
} from '@/routes/system/countries';

export default function CountryCreatePage() {
    return (
        <>
            <Head title="Create country" />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink
                    href={countriesIndex.url()}
                    variant="ghost"
                    size="sm"
                >
                    <ArrowLeft />
                    Back to countries
                </ActionLink>
                <Heading
                    title="Create country"
                    description="Add a country to the FieldOps reference directory."
                />
                <ReferenceDataForm
                    resource="country"
                    action={storeCountry.url()}
                    method="post"
                    submitLabel="Create country"
                    cancelHref={countriesIndex.url()}
                />
            </div>
        </>
    );
}

CountryCreatePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Countries', href: countriesIndex() },
        { title: 'Create country', href: countriesIndex() },
    ],
};
