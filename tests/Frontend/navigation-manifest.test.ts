import { describe, expect, it } from 'vitest';
import { getActiveNavigationItem, getNavigationGroups } from '@/lib/navigation';
import type { Auth } from '@/types';

describe('navigation manifest', () => {
    it('returns one permission-aware destination set for both layout packs', () => {
        const auth = {
            authorization: {
                permissions: ['dashboard.view', 'users.view', 'settings.view'],
                isSuperAdmin: false,
                role: null,
            },
        } as Auth;

        const destinations = getNavigationGroups(auth).flatMap((group) =>
            group.items.map((item) => item.title),
        );

        expect(destinations).toEqual([
            'Notifications',
            'Dashboard',
            'Users',
            'System settings',
        ]);
        expect(destinations).not.toContain('Repository');
        expect(destinations).not.toContain('Documentation');
        expect(destinations).not.toContain('Backup & Restore');
    });

    it('shows all permission-gated destinations to Super Admin', () => {
        const auth = {
            authorization: {
                permissions: [],
                isSuperAdmin: true,
                role: null,
            },
        } as Auth;

        const destinations = getNavigationGroups(auth).flatMap((group) =>
            group.items.map((item) => item.title),
        );

        expect(destinations).toContain('Users');
        expect(destinations).toContain('Roles');
        expect(destinations).toContain('Blocked IPs');
        expect(destinations).toContain('Countries');
        expect(destinations).toContain('Timezones');
        expect(destinations).toContain('Backup & Restore');
    });

    it('selects only the most specific matching navigation destination', () => {
        const auth = {
            authorization: {
                permissions: [],
                isSuperAdmin: true,
                role: null,
            },
        } as Auth;
        const items = getNavigationGroups(auth).flatMap((group) =>
            group.items.map((item) => item),
        );

        expect(
            getActiveNavigationItem(items, '/settings/system/backups')?.title,
        ).toBe('Backup & Restore');
        expect(
            getActiveNavigationItem(items, '/settings/system/address')?.title,
        ).toBe('System settings');
        expect(
            getActiveNavigationItem(items, '/settings/systematic')?.title,
        ).not.toBe('System settings');
    });
});
