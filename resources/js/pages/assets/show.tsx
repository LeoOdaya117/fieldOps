import { Pencil } from 'lucide-react';
import { ActionLink } from '@/components/action-link';
import { DetailsPage } from '@/components/details-page';
import { DetailsView } from '@/components/details-view';
import { RecordStatusControl } from '@/components/ui/record-status-control';
import { conditionLabel, formatCoordinate } from '@/features/assets/types';
import type { Asset } from '@/features/assets/types';
import { formatDateTime } from '@/lib/format-date';
import { dashboard } from '@/routes';
import { edit as editAsset, index as assetsIndex } from '@/routes/assets';

function actorLabel(actor: Asset['createdBy']): string {
    return actor ? `${actor.name} (${actor.email})` : 'System seed';
}

export default function AssetShowPage({
    asset,
    canUpdate = false,
    canUpdateDeleted = false,
}: {
    asset: Asset;
    canUpdate?: boolean;
    canViewDeleted?: boolean;
    canUpdateDeleted?: boolean;
}) {
    const hasCoordinates = asset.latitude !== null && asset.longitude !== null;

    return (
        <DetailsPage
            title={asset.name}
            description="Review asset identity, operational condition, location, and record status."
            backHref={assetsIndex.url()}
            backLabel="Back to assets"
            actions={
                canUpdate && asset.recordStatus === 1 ? (
                    <ActionLink href={editAsset.url(asset.id)}>
                        <Pencil />
                        Edit
                    </ActionLink>
                ) : null
            }
        >
            <DetailsView
                record={asset}
                summary={
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-link/10 text-link">
                            <span className="font-mono text-sm font-bold">
                                {asset.code.slice(0, 2)}
                            </span>
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold">
                                {asset.name}
                            </h2>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                                Asset code: {asset.code}
                            </p>
                        </div>
                    </div>
                }
                sections={[
                    {
                        key: 'definition',
                        title: 'Asset definition',
                        description:
                            'The stable identity and category used to reference this asset.',
                        columns: [
                            {
                                key: 'code',
                                label: 'Asset code',
                                cell: (record) => (
                                    <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
                                        {record.code}
                                    </code>
                                ),
                            },
                            {
                                key: 'name',
                                label: 'Name',
                                accessor: 'name',
                            },
                            {
                                key: 'category',
                                label: 'Category',
                                accessor: 'category',
                            },
                            {
                                key: 'condition',
                                label: 'Operational condition',
                                cell: (record) =>
                                    conditionLabel(record.condition),
                            },
                        ],
                    },
                    {
                        key: 'location',
                        title: 'Location',
                        description:
                            'Coordinates can be added or changed when editing this asset.',
                        columns: [
                            {
                                key: 'latitude',
                                label: 'Latitude',
                                cell: (record) =>
                                    hasCoordinates
                                        ? formatCoordinate(record.latitude)
                                        : 'Not set',
                            },
                            {
                                key: 'longitude',
                                label: 'Longitude',
                                cell: (record) =>
                                    hasCoordinates
                                        ? formatCoordinate(record.longitude)
                                        : 'Not set',
                            },
                        ],
                    },
                    {
                        key: 'status',
                        title: 'Record status',
                        description:
                            'Record status controls whether this asset appears in active directory results. Its code remains reserved while inactive.',
                        content: (
                            <div className="space-y-4">
                                <RecordStatusControl
                                    recordStatus={asset.recordStatus}
                                    label={asset.name}
                                    recordStatusUrl={asset.recordStatusUrl}
                                    canUpdateDeleted={canUpdateDeleted}
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    Operational condition is tracked separately
                                    from this record status.
                                </p>
                            </div>
                        ),
                    },
                    {
                        key: 'audit',
                        title: 'Audit fields',
                        description:
                            'Creation and last update actors for this record.',
                        columns: [
                            {
                                key: 'createdAt',
                                label: 'Created at',
                                cell: (record) =>
                                    formatDateTime(record.createdAt),
                            },
                            {
                                key: 'createdBy',
                                label: 'Created by',
                                cell: (record) => actorLabel(record.createdBy),
                            },
                            {
                                key: 'updatedAt',
                                label: 'Last updated',
                                cell: (record) =>
                                    formatDateTime(record.updatedAt),
                            },
                            {
                                key: 'updatedBy',
                                label: 'Updated by',
                                cell: (record) => actorLabel(record.updatedBy),
                            },
                        ],
                    },
                ]}
            />
        </DetailsPage>
    );
}

AssetShowPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Assets', href: assetsIndex() },
        { title: 'Asset details', href: assetsIndex() },
    ],
};
