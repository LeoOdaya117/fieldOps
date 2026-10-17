import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    router: { post: postMock },
}));

import { useIdleSession } from '@/features/session/use-idle-session';

function Harness({
    timeoutSeconds,
    sessionScope = 'session-a',
    enabled = true,
}: {
    timeoutSeconds: number;
    sessionScope?: string | null;
    enabled?: boolean;
}) {
    useIdleSession(enabled, timeoutSeconds, sessionScope);

    return null;
}

class MockBroadcastChannel {
    static instances: MockBroadcastChannel[] = [];
    readonly name: string;
    readonly received: unknown[] = [];
    private readonly listeners = new Set<(event: MessageEvent) => void>();

    constructor(name: string) {
        this.name = name;
        MockBroadcastChannel.instances.push(this);
    }

    addEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message') {
            this.listeners.add(listener);
        }
    }

    removeEventListener(type: string, listener: (event: MessageEvent) => void) {
        if (type === 'message') {
            this.listeners.delete(listener);
        }
    }

    postMessage(data: unknown) {
        for (const instance of MockBroadcastChannel.instances) {
            if (instance !== this && instance.name === this.name) {
                instance.received.push(data);
                instance.listeners.forEach((listener) =>
                    listener(new MessageEvent('message', { data })),
                );
            }
        }
    }

    close() {
        MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(
            (instance) => instance !== this,
        );
    }
}

describe('useIdleSession', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-05T00:00:00Z'));
        localStorage.clear();
        MockBroadcastChannel.instances = [];
        postMock.mockReset();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
        vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('records real activity, rate-limits heartbeats, and logs out at the inactivity limit', async () => {
        render(<Harness timeoutSeconds={60} />);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
        window.dispatchEvent(new Event('pointerdown'));
        await act(async () => Promise.resolve());
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(
            localStorage.getItem('fieldops:last-activity:session-a'),
        ).not.toBeNull();

        act(() => vi.advanceTimersByTime(60_000));
        expect(postMock).toHaveBeenCalledWith(
            '/logout',
            {},
            { preserveState: false },
        );
    });

    it('ignores a stale activity timestamp left by an earlier setup', () => {
        localStorage.setItem('fieldops:last-activity', '1');

        render(<Harness timeoutSeconds={60} sessionScope="new-session" />);

        act(() => vi.advanceTimersByTime(1000));

        expect(postMock).not.toHaveBeenCalled();
        expect(localStorage.getItem('fieldops:last-activity')).toBeNull();
    });

    it('keeps activity synchronized between tabs in the same session', () => {
        render(
            <>
                <Harness timeoutSeconds={60} />
                <Harness timeoutSeconds={60} />
            </>,
        );

        const secondBrowserTab = new MockBroadcastChannel(
            'fieldops:session-activity:session-a',
        );
        act(() => {
            vi.advanceTimersByTime(40_000);
            secondBrowserTab.postMessage({
                type: 'activity',
                timestamp: Date.now(),
            });
            vi.advanceTimersByTime(59_000);
        });

        expect(postMock).not.toHaveBeenCalled();
    });

    it('does not let activity from another session extend the timer', () => {
        render(
            <>
                <Harness timeoutSeconds={60} sessionScope="session-a" />
                <Harness timeoutSeconds={60} sessionScope="session-b" />
            </>,
        );

        const secondBrowserTab = new MockBroadcastChannel(
            'fieldops:session-activity:session-b',
        );

        act(() => {
            vi.advanceTimersByTime(40_000);
            secondBrowserTab.postMessage({
                type: 'activity',
                timestamp: Date.now(),
            });
            vi.advanceTimersByTime(20_000);
        });

        expect(postMock).toHaveBeenCalledTimes(1);
    });

    it('does not share logout messages across different sessions', () => {
        render(
            <>
                <Harness timeoutSeconds={60} sessionScope="session-a" />
                <Harness timeoutSeconds={60} sessionScope="session-b" />
            </>,
        );

        const [firstSession, secondSession] = MockBroadcastChannel.instances;
        act(() => firstSession?.postMessage({ type: 'logout' }));

        expect(secondSession?.received).toEqual([]);
    });

    it('does not start without an authenticated session scope', () => {
        render(<Harness timeoutSeconds={60} sessionScope={null} />);

        act(() => vi.advanceTimersByTime(61_000));

        expect(postMock).not.toHaveBeenCalled();
        expect(MockBroadcastChannel.instances).toHaveLength(0);
    });
});
