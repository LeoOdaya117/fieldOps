import { useForm } from '@inertiajs/react';
import { lazy, Suspense } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { ActionLink } from '@/components/action-link';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type {
    WorkOrder,
    WorkOrderAssetOption,
    WorkOrderPriority,
} from '../types';
import { WORK_ORDER_PRIORITIES } from '../types';

const MapboxMap = lazy(() => import('@/components/mapbox-map'));

type WorkOrderFormData = {
    reference: string;
    title: string;
    instructions: string;
    priority: WorkOrderPriority;
    due_date: string;
    asset_id: string;
    location_label: string;
    latitude: string;
    longitude: string;
    version?: number;
};

export function WorkOrderForm({
    workOrder,
    assets,
    action,
    method,
    submitLabel,
    cancelHref,
}: {
    workOrder?: WorkOrder;
    assets: WorkOrderAssetOption[];
    action: string;
    method: 'post' | 'patch';
    submitLabel: string;
    cancelHref: string;
}) {
    const assetOptions =
        workOrder?.asset &&
        !assets.some((asset) => asset.id === workOrder.assetId)
            ? [
                  ...assets,
                  { ...workOrder.asset, latitude: null, longitude: null },
              ]
            : assets;
    const form = useForm<WorkOrderFormData>({
        reference: workOrder?.reference ?? '',
        title: workOrder?.title ?? '',
        instructions: workOrder?.instructions ?? '',
        priority: workOrder?.priority ?? 'normal',
        due_date: workOrder?.dueDate ?? '',
        asset_id: workOrder?.assetId == null ? '' : String(workOrder.assetId),
        location_label: workOrder?.locationLabel ?? '',
        latitude: workOrder == null ? '' : String(workOrder.latitude),
        longitude: workOrder == null ? '' : String(workOrder.longitude),
        ...(workOrder == null ? {} : { version: workOrder.version }),
    });
    const selectedAsset = assetOptions.find(
        (asset) => String(asset.id) === form.data.asset_id,
    );
    const isExistingAsset =
        workOrder != null &&
        workOrder.assetId != null &&
        String(workOrder.assetId) === form.data.asset_id;
    const assetHasCoordinates =
        selectedAsset?.latitude != null && selectedAsset.longitude != null;
    const coordinatesFromAsset = Boolean(
        form.data.asset_id && (isExistingAsset || assetHasCoordinates),
    );
    const latitude = coordinateValue(form.data.latitude);
    const longitude = coordinateValue(form.data.longitude);
    const coordinate =
        latitude == null || longitude == null ? null : { latitude, longitude };
    const coordinateError = (form.errors as Record<string, string | undefined>)
        .coordinates;

    function chooseAsset(value: string) {
        const target = assetOptions.find((asset) => String(asset.id) === value);
        const isStoredAsset =
            workOrder != null && String(workOrder.assetId) === value;
        form.setData((current) => ({
            ...current,
            asset_id: value,
            latitude: isStoredAsset
                ? String(workOrder.latitude)
                : target?.latitude == null
                  ? ''
                  : String(target.latitude),
            longitude: isStoredAsset
                ? String(workOrder.longitude)
                : target?.longitude == null
                  ? ''
                  : String(target.longitude),
        }));
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        form.transform((data) => {
            const { reference, version, ...fields } = data;

            return {
                ...fields,
                ...(method === 'post'
                    ? { reference: reference.trim().toUpperCase() }
                    : { version }),
                title: data.title.trim(),
                instructions: data.instructions.trim(),
                due_date: data.due_date,
                asset_id: data.asset_id === '' ? null : Number(data.asset_id),
                location_label:
                    data.asset_id === '' ? data.location_label.trim() : null,
                latitude: coordinateValue(data.latitude),
                longitude: coordinateValue(data.longitude),
            };
        });

        if (method === 'post') {
            form.post(action);
        } else {
            form.patch(action);
        }
    }

    return (
        <Card className="max-w-4xl overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 px-4 py-5 sm:px-6">
                <CardTitle>Work order details</CardTitle>
                <CardDescription className="max-w-2xl leading-5">
                    Define the work and its due date. The location coordinates
                    are captured with this order and do not move when an asset
                    is relocated.
                </CardDescription>
            </CardHeader>
            <form onSubmit={submit}>
                <CardContent className="space-y-7 p-4 sm:p-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                        {workOrder == null ? (
                            <div className="grid content-start gap-2">
                                <Label htmlFor="work-order-reference">
                                    Work-order reference
                                </Label>
                                <Input
                                    id="work-order-reference"
                                    value={form.data.reference}
                                    onChange={(event) =>
                                        form.setData(
                                            'reference',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={32}
                                    autoCapitalize="characters"
                                    autoComplete="off"
                                    placeholder="WO-2026-001"
                                    className="h-11 font-mono uppercase"
                                    aria-invalid={Boolean(
                                        form.errors.reference,
                                    )}
                                    aria-describedby="work-order-reference-hint work-order-reference-error"
                                    required
                                />
                                <p
                                    id="work-order-reference-hint"
                                    className="text-xs leading-5 text-muted-foreground"
                                >
                                    Trimmed and saved in uppercase. It stays
                                    fixed after creation.
                                </p>
                                <InputError
                                    id="work-order-reference-error"
                                    message={form.errors.reference}
                                />
                            </div>
                        ) : (
                            <div className="grid content-start gap-2">
                                <Label>Work-order reference</Label>
                                <p className="flex h-11 items-center rounded-md border border-border bg-muted/30 px-3 font-mono text-sm">
                                    {workOrder.reference}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    This reference cannot be changed.
                                </p>
                            </div>
                        )}
                        <div className="grid content-start gap-2">
                            <Label htmlFor="work-order-title">Title</Label>
                            <Input
                                id="work-order-title"
                                value={form.data.title}
                                onChange={(event) =>
                                    form.setData('title', event.target.value)
                                }
                                maxLength={160}
                                className="h-11"
                                aria-invalid={Boolean(form.errors.title)}
                                aria-describedby="work-order-title-error"
                                required
                            />
                            <InputError
                                id="work-order-title-error"
                                message={form.errors.title}
                            />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="work-order-priority">
                                Priority
                            </Label>
                            <Select
                                value={form.data.priority}
                                onValueChange={(value) =>
                                    form.setData(
                                        'priority',
                                        value as WorkOrderPriority,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="work-order-priority"
                                    className="h-11 w-full"
                                    aria-invalid={Boolean(form.errors.priority)}
                                    aria-describedby="work-order-priority-error"
                                >
                                    <SelectValue placeholder="Choose priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    {WORK_ORDER_PRIORITIES.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError
                                id="work-order-priority-error"
                                message={form.errors.priority}
                            />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="work-order-due-date">
                                Due date
                            </Label>
                            <Input
                                id="work-order-due-date"
                                type="date"
                                value={form.data.due_date}
                                onChange={(event) =>
                                    form.setData('due_date', event.target.value)
                                }
                                className="h-11"
                                aria-invalid={Boolean(form.errors.due_date)}
                                aria-describedby="work-order-due-date-error"
                                required
                            />
                            <InputError
                                id="work-order-due-date-error"
                                message={form.errors.due_date}
                            />
                        </div>
                        <div className="grid content-start gap-2 sm:col-span-2">
                            <Label htmlFor="work-order-asset">
                                Asset (optional)
                            </Label>
                            <Select
                                value={form.data.asset_id || 'standalone'}
                                onValueChange={(value) =>
                                    chooseAsset(
                                        value === 'standalone' ? '' : value,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="work-order-asset"
                                    className="h-11 w-full"
                                    aria-invalid={Boolean(form.errors.asset_id)}
                                    aria-describedby="work-order-asset-hint work-order-asset-error"
                                >
                                    <SelectValue placeholder="Choose an asset or standalone location" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standalone">
                                        Standalone location
                                    </SelectItem>
                                    {assetOptions.map((asset) => (
                                        <SelectItem
                                            key={asset.id}
                                            value={String(asset.id)}
                                        >
                                            {asset.code} · {asset.name}
                                            {asset.latitude == null ||
                                            asset.longitude == null
                                                ? ' · enter coordinates'
                                                : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p
                                id="work-order-asset-hint"
                                className="text-xs leading-5 text-muted-foreground"
                            >
                                Only active assets can be selected for new work.
                                Existing historical references remain available
                                when editing.
                            </p>
                            <InputError
                                id="work-order-asset-error"
                                message={form.errors.asset_id}
                            />
                        </div>
                        {!form.data.asset_id ? (
                            <div className="grid content-start gap-2 sm:col-span-2">
                                <Label htmlFor="work-order-location-label">
                                    Standalone location
                                </Label>
                                <Input
                                    id="work-order-location-label"
                                    value={form.data.location_label}
                                    onChange={(event) =>
                                        form.setData(
                                            'location_label',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={255}
                                    placeholder="Street address or site description"
                                    className="h-11"
                                    aria-invalid={Boolean(
                                        form.errors.location_label,
                                    )}
                                    aria-describedby="work-order-location-label-error"
                                    required
                                />
                                <InputError
                                    id="work-order-location-label-error"
                                    message={form.errors.location_label}
                                />
                            </div>
                        ) : null}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="work-order-instructions">
                            Instructions
                        </Label>
                        <textarea
                            id="work-order-instructions"
                            value={form.data.instructions}
                            onChange={(event) =>
                                form.setData('instructions', event.target.value)
                            }
                            maxLength={5000}
                            rows={5}
                            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            aria-invalid={Boolean(form.errors.instructions)}
                            aria-describedby="work-order-instructions-error"
                        />
                        <InputError
                            id="work-order-instructions-error"
                            message={form.errors.instructions}
                        />
                    </div>
                    <fieldset className="grid gap-4 rounded-lg border border-border p-4 sm:p-5">
                        <legend className="px-1 text-sm font-semibold">
                            Location coordinates
                        </legend>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Enter latitude and longitude together. Manual
                            coordinates work without the map.
                        </p>
                        {coordinatesFromAsset ? (
                            <div
                                role="status"
                                className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
                            >
                                Coordinates are stored as this work order’s
                                location snapshot. Asset moves will not change
                                them.
                            </div>
                        ) : (
                            <Suspense
                                fallback={
                                    <div
                                        className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground"
                                        role="status"
                                    >
                                        Loading map controls…
                                    </div>
                                }
                            >
                                <MapboxMap
                                    value={coordinate}
                                    onChange={(point) =>
                                        form.setData((current) => ({
                                            ...current,
                                            latitude: String(point.latitude),
                                            longitude: String(point.longitude),
                                        }))
                                    }
                                    ariaLabel="Map for selecting work-order coordinates"
                                />
                            </Suspense>
                        )}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid content-start gap-2">
                                <Label htmlFor="work-order-latitude">
                                    Latitude
                                </Label>
                                <Input
                                    id="work-order-latitude"
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    min="-90"
                                    max="90"
                                    value={form.data.latitude}
                                    onChange={(event) =>
                                        form.setData(
                                            'latitude',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="12.8797"
                                    className="h-11 font-mono"
                                    readOnly={coordinatesFromAsset}
                                    aria-invalid={Boolean(
                                        form.errors.latitude || coordinateError,
                                    )}
                                    aria-describedby="work-order-coordinate-error work-order-coordinate-pair-error work-order-latitude-error"
                                    required
                                />
                                <InputError
                                    id="work-order-latitude-error"
                                    message={form.errors.latitude}
                                />
                            </div>
                            <div className="grid content-start gap-2">
                                <Label htmlFor="work-order-longitude">
                                    Longitude
                                </Label>
                                <Input
                                    id="work-order-longitude"
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    min="-180"
                                    max="180"
                                    value={form.data.longitude}
                                    onChange={(event) =>
                                        form.setData(
                                            'longitude',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="121.7740"
                                    className="h-11 font-mono"
                                    readOnly={coordinatesFromAsset}
                                    aria-invalid={Boolean(
                                        form.errors.longitude ||
                                        coordinateError,
                                    )}
                                    aria-describedby="work-order-coordinate-error work-order-coordinate-pair-error work-order-longitude-error"
                                    required
                                />
                                <InputError
                                    id="work-order-longitude-error"
                                    message={form.errors.longitude}
                                />
                            </div>
                        </div>
                        <InputError
                            id="work-order-coordinate-pair-error"
                            message={coordinateError}
                        />
                        <span
                            id="work-order-coordinate-error"
                            className="sr-only"
                        >
                            Latitude and longitude are required together and
                            must be within valid ranges.
                        </span>
                    </fieldset>
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4 border-t border-border bg-muted/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
                    <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                        <ActionLink href={cancelHref} variant="ghost">
                            Cancel
                        </ActionLink>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving…' : submitLabel}
                        </Button>
                    </div>
                </CardFooter>
            </form>
        </Card>
    );
}

function coordinateValue(value: string): number | null {
    if (value.trim() === '') {
        return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
}
