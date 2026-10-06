import SearchFilterSheet from '@/components/search-filter-sheet';
import { AdaptiveSelect } from '@/components/ui/adaptive-select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BackupFilters as Filters } from '../types';

export function BackupFilters({
    action,
    filters,
    pageSize,
    eventTypes,
    audit = false,
}: {
    action: string;
    filters: Filters;
    pageSize: number;
    eventTypes?: string[];
    audit?: boolean;
}) {
    return (
        <SearchFilterSheet
            action={action}
            resetHref={action}
            title={
                audit
                    ? 'Search and filter backup audit'
                    : 'Search and filter backups'
            }
            description={
                audit
                    ? 'Find recorded operations by actor, package, scope, or date.'
                    : 'Find packages by creator, table, note, scope, or date.'
            }
            activeFilterCount={
                [
                    filters.search,
                    filters.actor,
                    filters.scope,
                    filters.kind,
                    filters.event,
                    filters.status,
                    filters.backup,
                    filters.from,
                    filters.to,
                ].filter(Boolean).length
            }
            pageSize={pageSize}
            keyword={
                <div className="grid gap-2">
                    <Label htmlFor="backup-search">Search</Label>
                    <Input
                        id="backup-search"
                        name="search"
                        defaultValue={filters.search ?? ''}
                        maxLength={200}
                        placeholder="Table name, note, or package ID"
                        autoFocus
                    />
                </div>
            }
            dateRange={
                <div className="grid gap-2">
                    <Label htmlFor="backup-date-range">Date range</Label>
                    <DateRangePicker
                        id="backup-date-range"
                        from={filters.from}
                        to={filters.to}
                        fromName="from"
                        toName="to"
                        label="Backup date range"
                    />
                </div>
            }
        >
            <div className="grid gap-2">
                <Label htmlFor="backup-filter-actor">
                    {audit ? 'Actor' : 'Creator'}
                </Label>
                <Input
                    id="backup-filter-actor"
                    name="actor"
                    defaultValue={filters.actor ?? ''}
                    maxLength={200}
                    placeholder="Name"
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="backup-filter-scope">Scope</Label>
                <AdaptiveSelect
                    id="backup-filter-scope"
                    name="scope"
                    defaultValue={filters.scope ?? ''}
                    options={[
                        { value: '', label: 'All scopes' },
                        { value: 'database', label: 'Full database' },
                        { value: 'tables', label: 'Selected tables' },
                    ]}
                />
            </div>
            {!audit && (
                <div className="grid gap-2">
                    <Label htmlFor="backup-filter-kind">Package kind</Label>
                    <AdaptiveSelect
                        id="backup-filter-kind"
                        name="kind"
                        defaultValue={filters.kind ?? ''}
                        options={[
                            { value: '', label: 'All kinds' },
                            { value: 'manual', label: 'Manual backup' },
                            { value: 'uploaded', label: 'Uploaded backup' },
                            { value: 'safety', label: 'Safety backup' },
                        ]}
                    />
                </div>
            )}
            {audit && (
                <>
                    <div className="grid gap-2">
                        <Label htmlFor="backup-filter-event">Event</Label>
                        <AdaptiveSelect
                            id="backup-filter-event"
                            name="event"
                            defaultValue={filters.event ?? ''}
                            options={[
                                { value: '', label: 'All events' },
                                ...(eventTypes ?? []).map((event) => ({
                                    value: event,
                                    label: event.replaceAll('_', ' '),
                                })),
                            ]}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="backup-filter-status">Result</Label>
                        <AdaptiveSelect
                            id="backup-filter-status"
                            name="status"
                            defaultValue={filters.status ?? ''}
                            options={[
                                { value: '', label: 'All results' },
                                ...[
                                    'requested',
                                    'queued',
                                    'running',
                                    'verified',
                                    'succeeded',
                                    'failed',
                                    'interrupted',
                                ].map((status) => ({
                                    value: status,
                                    label:
                                        status.charAt(0).toUpperCase() +
                                        status.slice(1),
                                })),
                            ]}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="backup-filter-package">Backup ID</Label>
                        <Input
                            id="backup-filter-package"
                            name="backup"
                            defaultValue={filters.backup ?? ''}
                            maxLength={36}
                        />
                    </div>
                </>
            )}
            {filters.sort && (
                <input type="hidden" name="sort" value={filters.sort} />
            )}
            {filters.direction && (
                <input
                    type="hidden"
                    name="direction"
                    value={filters.direction}
                />
            )}
        </SearchFilterSheet>
    );
}
