import {
    Activity,
    BarChart3,
    Briefcase,
    Building2,
    Bell,
    Clipboard,
    Clock3,
    DatabaseBackup,
    Files,
    Folder,
    Globe2,
    LayoutGrid,
    Link2,
    Map,
    ScrollText,
    Settings2,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { describe, expect, it } from 'vitest';
import {
    getActiveNavigationItem,
    getNavigationGroups,
    getNavigationIcon,
} from '@/lib/navigation';
import type { Auth, AuthNavigationGroup } from '@/types';

const navigation: AuthNavigationGroup[] = [
    {
        label: 'Platform',
        items: [
            {
                key: 'notifications',
                title: 'Notifications',
                href: '/notifications',
                iconKey: 'bell',
            },
            {
                key: 'dashboard',
                title: 'Dashboard',
                href: '/dashboard',
                iconKey: 'layoutGrid',
            },
        ],
    },
    {
        label: 'Access',
        items: [
            {
                key: 'users',
                title: 'Users',
                href: '/access/users',
                iconKey: 'users',
            },
            {
                key: 'roles',
                title: 'Roles',
                href: '/access/roles',
                iconKey: 'shieldCheck',
            },
            {
                key: 'access_audit',
                title: 'Access audit',
                href: '/access/audit',
                iconKey: 'scrollText',
            },
            {
                key: 'blocked_ips',
                title: 'Blocked IPs',
                href: '/access/ip-blocks',
                iconKey: 'shieldCheck',
            },
            {
                key: 'visit_logs',
                title: 'Visit logs',
                href: '/access/visit-logs',
                iconKey: 'scrollText',
            },
        ],
    },
    {
        label: 'System',
        items: [
            {
                key: 'files',
                title: 'Files',
                href: '/files',
                iconKey: 'files',
            },
            {
                key: 'countries',
                title: 'Countries',
                href: '/system/countries',
                iconKey: 'globe2',
            },
            {
                key: 'timezones',
                title: 'Timezones',
                href: '/system/timezones',
                iconKey: 'clock3',
            },
            {
                key: 'system_settings',
                title: 'System settings',
                href: '/settings/system',
                iconKey: 'settings2',
            },
            {
                key: 'backups',
                title: 'Backup & Restore',
                href: '/settings/system/backups',
                iconKey: 'databaseBackup',
            },
        ],
    },
];

function authWithNavigation(groups: AuthNavigationGroup[]): Auth {
    return {
        user: {
            id: 1,
            name: 'Test user',
            email: 'test@example.com',
            email_verified_at: null,
            created_at: '',
            updated_at: '',
            status: 'active',
        },
        sessionScope: null,
        authorization: {
            permissions: [],
            isSuperAdmin: false,
            role: null,
        },
        navigation: groups,
    };
}

describe('navigation manifest', () => {
    it('uses the supplied role navigation without applying permission decisions', () => {
        const auth = authWithNavigation([
            { label: 'Platform', items: navigation[0].items.slice(0, 1) },
            { label: 'System', items: navigation[2].items.slice(0, 1) },
        ]);

        expect(getNavigationGroups(auth).map((group) => group.label)).toEqual([
            'Platform',
            'System',
        ]);
        expect(
            getNavigationGroups(auth).flatMap((group) =>
                group.items.map((item) => item.title),
            ),
        ).toEqual(['Notifications', 'Files']);
    });

    it('preserves item order across repeated group segments', () => {
        const groups = getNavigationGroups(
            authWithNavigation([
                { label: 'Platform', items: [navigation[0].items[1]] },
                { label: 'Access', items: [navigation[1].items[0]] },
                { label: 'Platform', items: [navigation[0].items[0]] },
            ]),
        );

        expect(groups.map((group) => group.label)).toEqual([
            'Platform',
            'Access',
            'Platform',
        ]);
        expect(
            groups.flatMap((group) => group.items.map((item) => item.key)),
        ).toEqual(['dashboard', 'users', 'notifications']);
    });

    it('maps each server icon key to its Lucide component', () => {
        const items = getNavigationGroups(
            authWithNavigation(navigation),
        ).flatMap((group) => group.items);

        expect(items.map((item) => item.icon)).toEqual([
            Bell,
            LayoutGrid,
            Users,
            ShieldCheck,
            ScrollText,
            ShieldCheck,
            ScrollText,
            Files,
            Globe2,
            Clock3,
            Settings2,
            DatabaseBackup,
        ]);
    });

    it('maps every custom icon key to a finite Lucide component', () => {
        expect(getNavigationIcon('activity')).toBe(Activity);
        expect(getNavigationIcon('map')).toBe(Map);
        expect(getNavigationIcon('folder')).toBe(Folder);
        expect(getNavigationIcon('link')).toBe(Link2);
        expect(getNavigationIcon('building')).toBe(Building2);
        expect(getNavigationIcon('barChart')).toBe(BarChart3);
        expect(getNavigationIcon('clipboard')).toBe(Clipboard);
        expect(getNavigationIcon('briefcase')).toBe(Briefcase);
    });

    it('keeps external HTTPS destinations out of internal active route matching', () => {
        const groups = getNavigationGroups(
            authWithNavigation([
                {
                    label: 'Custom',
                    items: [
                        {
                            key: 'custom_reports',
                            title: 'External reports',
                            href: 'https://reports.example.test/reports',
                            iconKey: 'link',
                        },
                        {
                            key: 'reports',
                            title: 'Internal reports',
                            href: '/reports',
                            iconKey: 'barChart',
                        },
                    ],
                },
            ]),
        );
        const items = groups.flatMap((group) => group.items);

        expect(items[0]?.external).toBe(true);
        expect(getActiveNavigationItem(items, '/reports/region')).toMatchObject(
            { title: 'Internal reports' },
        );
        expect(
            getActiveNavigationItem(items.slice(0, 1), '/reports'),
        ).toBeUndefined();
    });

    it('selects only the most specific matching navigation destination', () => {
        const items = getNavigationGroups(
            authWithNavigation(navigation),
        ).flatMap((group) => group.items);

        expect(
            getActiveNavigationItem(items, '/settings/system/backups'),
        ).toMatchObject({ title: 'Backup & Restore' });
        expect(
            getActiveNavigationItem(items, '/settings/system/address'),
        ).toMatchObject({ title: 'System settings' });
        expect(
            getActiveNavigationItem(items, '/settings/systematic'),
        ).toBeUndefined();
    });
});
