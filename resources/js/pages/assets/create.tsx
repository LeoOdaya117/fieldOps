import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import { AssetForm } from '@/features/assets/components/asset-form';
import { dashboard } from '@/routes';
import { index as assetsIndex, store as storeAsset } from '@/routes/assets';

export default function AssetCreatePage() {
    return (
        <>
            <Head title="Create asset" />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink href={assetsIndex.url()} variant="ghost" size="sm">
                    <ArrowLeft />
                    Back to assets
                </ActionLink>
                <Heading
                    title="Create asset"
                    description="Add an operational asset to the directory."
                />
                <AssetForm
                    action={storeAsset.url()}
                    method="post"
                    submitLabel="Create asset"
                    cancelHref={assetsIndex.url()}
                />
            </div>
        </>
    );
}

AssetCreatePage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Assets', href: assetsIndex() },
        { title: 'Create asset', href: assetsIndex() },
    ],
};
