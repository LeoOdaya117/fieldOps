import { Form, Head } from '@inertiajs/react';
import { Crosshair, MapPinned, Trash2 } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MapCoordinate } from '@/types';

const MapboxMap = lazy(() => import('@/components/mapbox-map'));

type Props = {
    coordinate: MapCoordinate | null;
};

function parseCoordinate(
    latitude: string,
    longitude: string,
): MapCoordinate | null {
    const lat = Number(latitude);
    const lng = Number(longitude);

    return latitude !== '' &&
        longitude !== '' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
        ? { latitude: lat, longitude: lng }
        : null;
}

export default function OrganizationMap({ coordinate }: Props) {
    const [latitude, setLatitude] = useState(
        coordinate?.latitude.toFixed(7) ?? '',
    );
    const [longitude, setLongitude] = useState(
        coordinate?.longitude.toFixed(7) ?? '',
    );
    const mapValue = useMemo(
        () => parseCoordinate(latitude, longitude),
        [latitude, longitude],
    );

    const setCoordinate = (next: MapCoordinate) => {
        setLatitude(next.latitude.toFixed(7));
        setLongitude(next.longitude.toFixed(7));
    };

    return (
        <>
            <Head title="Organization map" />

            <div className="settings-workspace overflow-hidden border border-border bg-card text-card-foreground">
                <Form
                    action="/settings/system/map"
                    method="patch"
                    options={{ preserveScroll: true }}
                >
                    {({ errors, processing }) => (
                        <>
                            <section className="settings-section">
                                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                            <MapPinned
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <div className="max-w-2xl">
                                            <h2 className="text-base font-semibold">
                                                Exact map location
                                            </h2>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                Click the map or drag its pin.
                                                These coordinates stay
                                                independent from the
                                                administrative address.
                                            </p>
                                        </div>
                                    </div>
                                    {(latitude || longitude) && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setLatitude('');
                                                setLongitude('');
                                            }}
                                        >
                                            <Trash2 className="size-4" />
                                            Clear
                                        </Button>
                                    )}
                                </div>

                                <Suspense
                                    fallback={
                                        <div
                                            className="min-h-80 animate-pulse rounded-lg bg-muted motion-reduce:animate-none"
                                            aria-label="Loading map"
                                        />
                                    }
                                >
                                    <MapboxMap
                                        value={mapValue}
                                        onChange={setCoordinate}
                                        className="h-[24rem]"
                                    />
                                </Suspense>

                                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="map-latitude">
                                            Latitude
                                        </Label>
                                        <Input
                                            id="map-latitude"
                                            name="latitude"
                                            type="number"
                                            min={-90}
                                            max={90}
                                            step="any"
                                            inputMode="decimal"
                                            value={latitude}
                                            onChange={(event) =>
                                                setLatitude(event.target.value)
                                            }
                                            placeholder="14.5995124"
                                            className="tabular-nums"
                                            aria-invalid={Boolean(
                                                errors.latitude,
                                            )}
                                            aria-describedby={
                                                errors.latitude
                                                    ? 'map-latitude-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="map-latitude-error"
                                            message={errors.latitude}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="map-longitude">
                                            Longitude
                                        </Label>
                                        <Input
                                            id="map-longitude"
                                            name="longitude"
                                            type="number"
                                            min={-180}
                                            max={180}
                                            step="any"
                                            inputMode="decimal"
                                            value={longitude}
                                            onChange={(event) =>
                                                setLongitude(event.target.value)
                                            }
                                            placeholder="120.9842195"
                                            className="tabular-nums"
                                            aria-invalid={Boolean(
                                                errors.longitude,
                                            )}
                                            aria-describedby={
                                                errors.longitude
                                                    ? 'map-longitude-error'
                                                    : undefined
                                            }
                                        />
                                        <InputError
                                            id="map-longitude-error"
                                            message={errors.longitude}
                                        />
                                    </div>
                                </div>
                            </section>

                            <footer className="flex items-center justify-between gap-4 border-t border-border bg-muted/35 px-5 py-4 sm:px-7">
                                <p className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                                    <Crosshair
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Coordinate inputs are always available as
                                    the accessible map alternative.
                                </p>
                                <Button disabled={processing}>
                                    {processing
                                        ? 'Saving…'
                                        : 'Save map location'}
                                </Button>
                            </footer>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

OrganizationMap.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'System settings', href: '/settings/system' },
        { title: 'Map', href: '/settings/system/map' },
    ],
};
