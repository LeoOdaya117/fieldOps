export const pageFamilies = [
    'landing',
    'dashboard',
    'list',
    'detail',
    'form',
    'settings',
    'auth',
    'generic',
] as const;

export type PageFamily = (typeof pageFamilies)[number];

const listPaths = new Set([
    '/notifications',
    '/access/users',
    '/access/users/registrations',
    '/access/roles',
    '/access/audit',
    '/access/ip-blocks',
    '/access/visit-logs',
    '/system/countries',
    '/system/timezones',
]);

const formPaths = new Set([
    '/access/users/create',
    '/access/users/invite',
    '/access/roles/create',
    '/access/ip-blocks/create',
    '/system/countries/create',
    '/system/timezones/create',
]);

const authPath =
    /^\/(?:login|register|forgot-password|reset-password(?:\/[^/]+)?|email\/verify(?:\/[^/]+\/[^/]+)?|two-factor-challenge|user\/confirm-password|invitations\/[^/]+)\/?$/;

function pathnameOf(destination: string | URL): string {
    try {
        const origin =
            typeof window === 'undefined'
                ? 'http://localhost'
                : window.location.origin;
        const pathname = new URL(destination, origin).pathname;

        return pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
    } catch {
        return typeof destination === 'string'
            ? destination.split(/[?#]/, 1)[0]
            : '/';
    }
}

/** Resolve a page family from the destination URL; unknown pages use a safe generic layout. */
export function resolvePageFamily(destination: string | URL): PageFamily {
    const pathname = pathnameOf(destination);

    if (pathname === '/') {
        return 'landing';
    }

    if (pathname === '/dashboard') {
        return 'dashboard';
    }

    if (authPath.test(pathname)) {
        return 'auth';
    }

    if (pathname === '/settings' || pathname.startsWith('/settings/')) {
        return 'settings';
    }

    if (listPaths.has(pathname)) {
        return 'list';
    }

    if (formPaths.has(pathname) || /\/edit$/.test(pathname)) {
        return 'form';
    }

    if (
        /^\/access\/(?:users|roles|ip-blocks|visit-logs|audit)(?:\/[^/]+)$/.test(
            pathname,
        ) ||
        /^\/access\/users\/registrations\/[^/]+$/.test(pathname) ||
        /^\/system\/(?:countries|timezones)\/[^/]+$/.test(pathname)
    ) {
        return 'detail';
    }

    return 'generic';
}
