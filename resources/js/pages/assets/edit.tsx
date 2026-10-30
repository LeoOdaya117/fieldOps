import { Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import Heading from '@/components/heading';
import { AssetForm } from '@/features/assets/components/asset-form';
import type { Asset } from '@/features/assets/types';
import { dashboard } from '@/routes';
import { index as assetsIndex, update as updateAsset } from '@/routes/assets';

export default function AssetEditPage({ asset }: { asset: Asset }) {
    return (
        <>
            <Head title={`Edit ${asset.name}`} />
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <ActionLink href={assetsIndex.url()} variant="ghost" size="sm">
                    <ArrowLeft />
                    Back to assets
                </ActionLink>
                <Heading
                    title={`Edit ${asset.name}`}
                    description="Update this asset’s directory details and location."
                />
                <AssetForm
                    asset={asset}
                    action={updateAsset.url(asset.id)}
                    method="patch"
                    submitLabel="Save changes"
                    cancelHref={assetsIndex.url()}
                />
            </div>
        </>
    );
}

AssetEditPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Assets', href: assetsIndex() },
        { title: 'Edit asset', href: assetsIndex() },
    ],
};
