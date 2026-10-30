import { Edit, Eye } from 'lucide-react';
import { SortableColumn } from '@/components/sortable-column';
import { RecordStatusControl } from '@/components/ui/record-status-control';
import type { DataTableColumn } from '@/components/ui/data-table';
import { TableActionLink, TableActions } from '@/components/ui/table-actions';
import { formatDateTime } from '@/lib/format-date';
import {
    edit as editAsset,
    index as assetsIndex,
    show as showAsset,
} from '@/routes/assets';
import { conditionLabel } from '../types';
import type { Asset, AssetFilters } from '../types';

export function assetTableColumns({
    filters,
    canUpdate,
    canUpdateDeleted,
    firstRowNumber,
}: {
    filters: AssetFilters;
    canUpdate: boolean;
    canUpdateDeleted: boolean;
    firstRowNumber: number;
}): DataTableColumn<Asset>[] {
    const sort = filters.sort ?? '';
    const direction = filters.direction ?? 'asc';
    const hidden = {
        search: filters.search,
        category: filters.category,
        condition: filters.condition,
        record_status: filters.recordStatus,
    };

    return [
        {
            key: 'serial',
            header: '#',
            hideable: false,
            headerClassName: 'w-12 px-2 text-center',
            cellClassName:
                'w-12 px-2 text-center text-xs tabular-nums text-muted-foreground',
            cell: (_asset, index) => firstRowNumber + index,
        },
        {
            key: 'code',
            label: 'Asset code',
            header: (
                <SortableColumn
                    action={assetsIndex.url()}
                    label="Asset code"
                    sortKey="code"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (asset) => (
                <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold text-foreground">
                    {asset.code}
                </code>
            ),
        },
        {
            key: 'name',
            label: 'Name',
            header: (
                <SortableColumn
                    action={assetsIndex.url()}
                    label="Name"
                    sortKey="name"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (asset) => (
                <span className="font-medium text-foreground">
                    {asset.name}
                </span>
            ),
        },
        {
            key: 'category',
            label: 'Category',
            header: (
                <SortableColumn
                    action={assetsIndex.url()}
                    label="Category"
                    sortKey="category"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (asset) => asset.category,
        },
        {
            key: 'condition',
            label: 'Condition',
            header: (
                <SortableColumn
                    action={assetsIndex.url()}
                    label="Condition"
                    sortKey="condition"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (asset) => conditionLabel(asset.condition),
        },
        {
            key: 'record_status',
            label: 'Record status',
            header: (
                <SortableColumn
                    action={assetsIndex.url()}
                    label="Record status"
                    sortKey="record_status"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (asset) => (
                <RecordStatusControl
                    recordStatus={asset.recordStatus}
                    label={asset.name}
                    recordStatusUrl={asset.recordStatusUrl}
                    canUpdateDeleted={canUpdateDeleted}
                />
            ),
        },
        {
            key: 'updated_at',
            label: 'Last updated',
            header: (
                <SortableColumn
                    action={assetsIndex.url()}
                    label="Last updated"
                    sortKey="updated_at"
                    sort={sort}
                    direction={direction}
                    hidden={hidden}
                />
            ),
            cell: (asset) => formatDateTime(asset.updatedAt),
        },
        {
            key: 'actions',
            header: 'Actions',
            hideable: false,
            headerClassName: 'px-6 text-right',
            cellClassName: 'px-6',
            cell: (asset) => (
                <TableActions label={`Actions for ${asset.name}`}>
                    <TableActionLink href={showAsset.url(asset.id)}>
                        <Eye />
                        View
                    </TableActionLink>
                    {canUpdate && asset.recordStatus === 1 && (
                        <TableActionLink href={editAsset.url(asset.id)}>
                            <Edit />
                            Edit
                        </TableActionLink>
                    )}
                </TableActions>
            ),
        },
    ];
}
