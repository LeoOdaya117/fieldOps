import { useCallback, useRef, useState } from 'react';

export type BrowserLocation = {
    latitude: number;
    longitude: number;
    accuracy: number;
    timezone: string | null;
};

export type BrowserLocationStatus =
    'idle' | 'pending' | 'available' | 'unavailable';

export type BrowserLocationPayload = {
    location_latitude?: number;
    location_longitude?: number;
    location_accuracy_meters?: number;
    location_timezone?: string;
};

function browserTimezone(): string | null {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        return timezone || null;
    } catch {
        return null;
    }
}

export function requestBrowserLocation(): Promise<BrowserLocation | null> {
    if (
        typeof navigator === 'undefined' ||
        !navigator.geolocation ||
        (typeof window !== 'undefined' &&
            !window.isSecureContext &&
            !['localhost', '127.0.0.1', '[::1]'].includes(
                window.location.hostname,
            ))
    ) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                if (
                    !Number.isFinite(coords.latitude) ||
                    !Number.isFinite(coords.longitude) ||
                    !Number.isFinite(coords.accuracy)
                ) {
                    resolve(null);

                    return;
                }

                resolve({
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy,
                    timezone: browserTimezone(),
                });
            },
            () => resolve(null),
            {
                enableHighAccuracy: true,
                maximumAge: 60_000,
                timeout: 10_000,
            },
        );
    });
}

export function browserLocationPayload(
    location: BrowserLocation | null,
): BrowserLocationPayload {
    if (location === null) {
        return {};
    }

    return {
        location_latitude: location.latitude,
        location_longitude: location.longitude,
        location_accuracy_meters: location.accuracy,
        ...(location.timezone !== null
            ? { location_timezone: location.timezone }
            : {}),
    };
}

export function useBrowserLocation(): {
    location: BrowserLocation | null;
    status: BrowserLocationStatus;
    request: () => Promise<BrowserLocation | null>;
} {
    const [location, setLocation] = useState<BrowserLocation | null>(null);
    const [status, setStatus] = useState<BrowserLocationStatus>('idle');
    const requestRef = useRef<Promise<BrowserLocation | null> | null>(null);
    const request = useCallback(() => {
        if (requestRef.current !== null) {
            return requestRef.current;
        }

        setStatus('pending');
        const promise = requestBrowserLocation()
            .then((nextLocation) => {
                setLocation(nextLocation);
                setStatus(nextLocation === null ? 'unavailable' : 'available');

                return nextLocation;
            })
            .finally(() => {
                requestRef.current = null;
            });
        requestRef.current = promise;

        return promise;
    }, []);

    return { location, request, status };
}
