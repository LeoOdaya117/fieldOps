import { describe, expect, it } from 'vitest';
import { getNavigationGroups } from '@/lib/navigation';
import type { Auth } from '@/types';

describe('navigation manifest', () => {
    it('returns one permission-aware destination set for both layout packs', () => {
        const auth = {
            authorization: {
                permissions: ['dashboard.view', 'users.view', 'settings.manage_system'],
                isOwner: false,
                role: null,
            },
        } as Auth;

        const destinations = getNavigationGroups(auth).flatMap((group) => group.items.map((item) => item.title));

        expect(destinations).toEqual(['Dashboard', 'Users', 'System settings']);
        expect(destinations).not.toContain('Repository');
        expect(destinations).not.toContain('Documentation');
    });
});
