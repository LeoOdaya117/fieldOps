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
import { ASSET_CONDITIONS } from '../types';
import type { Asset, AssetCondition } from '../types';

const MapboxMap = lazy(() => import('@/components/mapbox-map'));

type AssetFormData = {
    code: string;
    name: string;
    category: string;
    condition: AssetCondition;
    latitude: string;
    longitude: string;
};

export function AssetForm({
    asset,
    action,
    method,
    submitLabel,
    cancelHref,
}: {
    asset?: Asset;
    action: string;
    method: 'post' | 'patch';
    submitLabel: string;
    cancelHref: string;
}) {
    const form = useForm<AssetFormData>({
        code: asset?.code ?? '',
        name: asset?.name ?? '',
        category: asset?.category ?? '',
        condition: asset?.condition ?? 'operational',
        latitude: asset?.latitude == null ? '' : String(asset.latitude),
        longitude: asset?.longitude == null ? '' : String(asset.longitude),
    });
    const latitude = coordinateValue(form.data.latitude);
    const longitude = coordinateValue(form.data.longitude);
    const coordinate =
        latitude === null || longitude === null
            ? null
            : { latitude, longitude };
    const coordinatePairError = (
        form.errors as Record<string, string | undefined>
    ).coordinates;

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            code: data.code.trim().toUpperCase(),
            name: data.name.trim(),
            category: data.category.trim(),
            latitude:
                data.latitude.trim() === '' ? null : Number(data.latitude),
            longitude:
                data.longitude.trim() === '' ? null : Number(data.longitude),
        }));

        if (method === 'post') {
            form.post(action);
        } else {
            form.patch(action);
        }
    }

    return (
        <Card className="max-w-4xl overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 px-4 py-5 sm:px-6">
                <CardTitle>Asset details</CardTitle>
                <CardDescription className="max-w-2xl leading-5">
                    Keep a stable asset code and location for future work
                    orders. Operational condition is separate from the asset
                    record’s active status.
                </CardDescription>
            </CardHeader>
            <form onSubmit={submit}>
                <CardContent className="space-y-7 p-4 sm:p-6">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="grid content-start gap-2">
                            <Label htmlFor="asset-code">Asset code</Label>
                            <Input
                                id="asset-code"
                                value={form.data.code}
                                onChange={(event) =>
                                    form.setData('code', event.target.value)
                                }
                                maxLength={32}
                                autoCapitalize="characters"
                                autoComplete="off"
                                placeholder="PUMP-001"
                                className="h-11 font-mono uppercase"
                                aria-invalid={Boolean(form.errors.code)}
                                aria-describedby="asset-code-hint asset-code-error"
                                required
                            />
                            <p
                                id="asset-code-hint"
                                className="text-xs leading-5 text-muted-foreground"
                            >
                                Use 2–32 letters, numbers, dots, underscores, or
                                hyphens. Codes are normalized to uppercase and
                                stay reserved when an asset is inactive.
                            </p>
                            <InputError
                                id="asset-code-error"
                                message={form.errors.code}
                            />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="asset-name">Name</Label>
                            <Input
                                id="asset-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                maxLength={160}
                                placeholder="North pump station"
                                className="h-11"
                                aria-invalid={Boolean(form.errors.name)}
                                aria-describedby="asset-name-error"
                                required
                            />
                            <InputError
                                id="asset-name-error"
                                message={form.errors.name}
                            />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="asset-category">Category</Label>
                            <Input
                                id="asset-category"
                                value={form.data.category}
                                onChange={(event) =>
                                    form.setData('category', event.target.value)
                                }
                                maxLength={80}
                                placeholder="Pump"
                                className="h-11"
                                aria-invalid={Boolean(form.errors.category)}
                                aria-describedby="asset-category-hint asset-category-error"
                                required
                            />
                            <p
                                id="asset-category-hint"
                                className="text-xs leading-5 text-muted-foreground"
                            >
                                Enter a short category such as Pump, Vehicle, or
                                Building.
                            </p>
                            <InputError
                                id="asset-category-error"
                                message={form.errors.category}
                            />
                        </div>
                        <div className="grid content-start gap-2">
                            <Label htmlFor="asset-condition">
                                Operational condition
                            </Label>
                            <Select
                                value={form.data.condition}
                                onValueChange={(value) =>
                                    form.setData(
                                        'condition',
                                        value as AssetCondition,
                                    )
                                }
                            >
                                <SelectTrigger
                                    id="asset-condition"
                                    className="h-11 w-full"
                                    aria-invalid={Boolean(
                                        form.errors.condition,
                                    )}
                                    aria-describedby="asset-condition-error"
                                >
                                    <SelectValue placeholder="Choose a condition" />
                                </SelectTrigger>
                                <SelectContent avoidCollisions>
                                    {ASSET_CONDITIONS.map((condition) => (
                                        <SelectItem
                                            key={condition.value}
                                            value={condition.value}
                                        >
                                            {condition.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError
                                id="asset-condition-error"
                                message={form.errors.condition}
                            />
                        </div>
                    </div>

                    <fieldset className="grid gap-4 rounded-lg border border-border p-4 sm:p-5">
                        <legend className="px-1 text-sm font-semibold">
                            Location coordinates
                        </legend>
                        <p className="text-sm leading-6 text-muted-foreground">
                            Enter latitude and longitude together, or leave both
                            empty. The map is optional.
                        </p>
                        <Suspense
                            fallback={
                                <div
                                    className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground"
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
                                ariaLabel="Map for selecting asset coordinates"
                            />
                        </Suspense>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid content-start gap-2">
                                <Label htmlFor="asset-latitude">Latitude</Label>
                                <Input
                                    id="asset-latitude"
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
                                    aria-invalid={Boolean(form.errors.latitude)}
                                    aria-describedby="asset-coordinate-error asset-latitude-error"
                                />
                                <InputError
                                    id="asset-latitude-error"
                                    message={form.errors.latitude}
                                />
                            </div>
                            <div className="grid content-start gap-2">
                                <Label htmlFor="asset-longitude">
                                    Longitude
                                </Label>
                                <Input
                                    id="asset-longitude"
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
                                    aria-invalid={Boolean(
                                        form.errors.longitude,
                                    )}
                                    aria-describedby="asset-coordinate-error asset-longitude-error"
                                />
                                <InputError
                                    id="asset-longitude-error"
                                    message={form.errors.longitude}
                                />
                            </div>
                        </div>
                        <InputError message={coordinatePairError} />
                        <span id="asset-coordinate-error" className="sr-only">
                            Coordinates must be supplied together and within
                            valid latitude and longitude ranges.
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
