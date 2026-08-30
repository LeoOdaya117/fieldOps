import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    browserLocationPayload,
    requestBrowserLocation,
    useBrowserLocation,
} from '@/hooks/use-browser-location';

function setGeolocation(value: Geolocation): void {
    Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value,
    });
}

afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: undefined,
    });
});

describe('browser location capture', () => {
    it('reads coordinates and accuracy from the browser geolocation API', async () => {
        const getCurrentPosition = vi.fn((success: PositionCallback) => {
            success({
                coords: {
                    latitude: 14.5995,
                    longitude: 120.9842,
                    accuracy: 25.4,
                } as GeolocationCoordinates,
                timestamp: Date.now(),
            } as GeolocationPosition);
        });
        setGeolocation({ getCurrentPosition } as unknown as Geolocation);

        await expect(requestBrowserLocation()).resolves.toMatchObject({
            latitude: 14.5995,
            longitude: 120.9842,
            accuracy: 25.4,
        });
        expect(getCurrentPosition).toHaveBeenCalledWith(
            expect.any(Function),
            expect.any(Function),
            {
                enableHighAccuracy: true,
                maximumAge: 60_000,
                timeout: 10_000,
            },
        );
    });

    it('returns no location when the browser denies the request', async () => {
        const getCurrentPosition = vi.fn(
            (_success: PositionCallback, error: PositionErrorCallback) => {
                error({
                    code: 1,
                    message: 'Permission denied',
                } as GeolocationPositionError);
            },
        );
        setGeolocation({ getCurrentPosition } as unknown as Geolocation);

        await expect(requestBrowserLocation()).resolves.toBeNull();
    });

    it('waits for an explicit request before asking the browser', async () => {
        const getCurrentPosition = vi.fn((success: PositionCallback) => {
            success({
                coords: {
                    latitude: 14.5995,
                    longitude: 120.9842,
                    accuracy: 25.4,
                } as GeolocationCoordinates,
                timestamp: Date.now(),
            } as GeolocationPosition);
        });
        setGeolocation({ getCurrentPosition } as unknown as Geolocation);

        const { result } = renderHook(() => useBrowserLocation());

        expect(getCurrentPosition).not.toHaveBeenCalled();
        await act(async () => {
            await result.current.request();
        });

        expect(getCurrentPosition).toHaveBeenCalledTimes(1);
        expect(result.current.status).toBe('available');
    });

    it('converts a browser location to authentication request fields', () => {
        expect(
            browserLocationPayload({
                latitude: 14.5995,
                longitude: 120.9842,
                accuracy: 25.4,
                timezone: 'Asia/Manila',
            }),
        ).toEqual({
            location_latitude: 14.5995,
            location_longitude: 120.9842,
            location_accuracy_meters: 25.4,
            location_timezone: 'Asia/Manila',
        });
        expect(browserLocationPayload(null)).toEqual({});
    });
});
