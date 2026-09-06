import { AlertCircle, MapPinned } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxInstance, Marker as MapboxMarker } from 'mapbox-gl';
import { cn } from '@/lib/utils';
import type { MapboxMapProps, MapCoordinate } from '@/types';

const DEFAULT_CENTER: MapCoordinate = { latitude: 12.8797, longitude: 121.774 };

function webGlAvailable(): boolean {
    try {
        const canvas = document.createElement('canvas');

        return Boolean(
            canvas.getContext('webgl2') || canvas.getContext('webgl'),
        );
    } catch {
        return false;
    }
}

export function MapboxMap({
    value,
    onChange,
    interactive = true,
    initialCenter = DEFAULT_CENTER,
    initialZoom = 4.5,
    ariaLabel = 'Map for selecting organization coordinates',
    className,
}: MapboxMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapboxInstance | null>(null);
    const markerRef = useRef<MapboxMarker | null>(null);
    const onChangeRef = useRef(onChange);
    const initialValueRef = useRef(value);
    const [status, setStatus] = useState<
        'ready' | 'missing-token' | 'unsupported' | 'failed'
    >(import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ? 'ready' : 'missing-token');

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

        if (!token || !containerRef.current) {
            return;
        }

        let disposed = false;

        if (!webGlAvailable()) {
            queueMicrotask(() => {
                if (!disposed) {
                    setStatus('unsupported');
                }
            });

            return () => {
                disposed = true;
            };
        }

        let resizeObserver: ResizeObserver | null = null;

        void import('mapbox-gl')
            .then(({ default: mapboxgl }) => {
                if (disposed || !containerRef.current) {
                    return;
                }

                mapboxgl.accessToken = token;
                const initialValue = initialValueRef.current;
                const center = initialValue ?? initialCenter;
                const prefersReducedMotion = window.matchMedia(
                    '(prefers-reduced-motion: reduce)',
                ).matches;
                const map = new mapboxgl.Map({
                    container: containerRef.current,
                    style: 'mapbox://styles/mapbox/streets-v12',
                    center: [center.longitude, center.latitude],
                    zoom: initialValue
                        ? Math.max(initialZoom, 12)
                        : initialZoom,
                    interactive,
                    attributionControl: true,
                    fadeDuration: prefersReducedMotion ? 0 : 300,
                });
                mapRef.current = map;

                const placeMarker = (coordinate: MapCoordinate) => {
                    if (!markerRef.current) {
                        const marker = new mapboxgl.Marker({
                            draggable: interactive,
                        })
                            .setLngLat([
                                coordinate.longitude,
                                coordinate.latitude,
                            ])
                            .addTo(map);
                        marker.on('dragend', () => {
                            const point = marker.getLngLat();
                            onChangeRef.current?.({
                                latitude: point.lat,
                                longitude: point.lng,
                            });
                        });
                        markerRef.current = marker;
                    } else {
                        markerRef.current.setLngLat([
                            coordinate.longitude,
                            coordinate.latitude,
                        ]);
                    }
                };

                if (initialValue) {
                    placeMarker(initialValue);
                }

                if (interactive) {
                    map.on('click', (event) => {
                        const coordinate = {
                            latitude: event.lngLat.lat,
                            longitude: event.lngLat.lng,
                        };
                        placeMarker(coordinate);
                        onChangeRef.current?.(coordinate);
                    });
                }

                resizeObserver = new ResizeObserver(() => map.resize());
                resizeObserver.observe(containerRef.current);
            })
            .catch(() => setStatus('failed'));

        return () => {
            disposed = true;
            resizeObserver?.disconnect();
            markerRef.current?.remove();
            markerRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [initialCenter, initialZoom, interactive]);

    useEffect(() => {
        if (!value || !mapRef.current) {
            if (!value) {
                markerRef.current?.remove();
                markerRef.current = null;
            }

            return;
        }

        markerRef.current?.setLngLat([value.longitude, value.latitude]);
    }, [value]);

    if (status !== 'ready') {
        const missingToken = status === 'missing-token';

        return (
            <div
                className={cn(
                    'flex min-h-80 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6',
                    className,
                )}
                role="status"
            >
                <div className="max-w-md text-center">
                    <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        {missingToken ? (
                            <MapPinned className="size-5" />
                        ) : (
                            <AlertCircle className="size-5" />
                        )}
                    </span>
                    <p className="mt-4 text-sm font-semibold">
                        {missingToken
                            ? 'Mapbox is ready for a public token'
                            : 'The interactive map is unavailable'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {missingToken
                            ? 'Add VITE_MAPBOX_PUBLIC_TOKEN to your local .env file, then restart Vite. Coordinates remain fully editable below.'
                            : 'WebGL or the map service could not start. You can still enter and save coordinates below.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            role="region"
            aria-label={ariaLabel}
            className={cn(
                'min-h-80 overflow-hidden rounded-lg bg-muted',
                className,
            )}
        />
    );
}

export default MapboxMap;
