import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import ReferenceDataForm from '@/features/system/components/reference-data-form';
import type { Country } from '@/features/system/types';
import { dashboard } from '@/routes';
import {
    index as countriesIndex,
    update as updateCountry,
} from '@/routes/system/countries';

export default function CountryEditPage({ country }: { country: Country }) {
    return (
        <>
            <Head title={`Edit ${country.name}`} />
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
                    title={`Edit ${country.name}`}
                    description="Update the country code and directory name."
                />
                <ReferenceDataForm
                    resource="country"
                    action={updateCountry.url(country.id)}
                    method="patch"
                    initialCode={country.code}
                    initialName={country.name}
                    submitLabel="Save changes"
                    cancelHref={countriesIndex.url()}
                />
            </div>
        </>
    );
}

CountryEditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Countries', href: countriesIndex() },
        { title: 'Edit country', href: countriesIndex() },
    ],
};
