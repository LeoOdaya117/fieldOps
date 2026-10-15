import { render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', () => ({
    router: { post: postMock },
}));

import { useIdleSession } from '@/features/session/use-idle-session';

function Harness({ timeoutSeconds }: { timeoutSeconds: number }) {
    useIdleSession(true, timeoutSeconds);

    return null;
}

describe('useIdleSession', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-05T00:00:00Z'));
        localStorage.clear();
        postMock.mockReset();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
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
        expect(localStorage.getItem('fieldops:last-activity')).not.toBeNull();

        act(() => vi.advanceTimersByTime(60_000));
        expect(postMock).toHaveBeenCalledWith('/logout', {}, { preserveState: false });
    });
});
