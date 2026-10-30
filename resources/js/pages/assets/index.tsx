import { dashboard } from '@/routes';
import { index as assetsIndex } from '@/routes/assets';
import { AssetsList } from '@/features/assets/components/assets-list';
import type { AssetFilters, PaginatedAssets } from '@/features/assets/types';

export default function AssetsIndexPage(props: {
    assets: PaginatedAssets;
    canCreate?: boolean;
    canUpdate?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
    filters: AssetFilters;
}) {
    return <AssetsList {...props} />;
}

AssetsIndexPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Assets', href: assetsIndex() },
    ],
};
