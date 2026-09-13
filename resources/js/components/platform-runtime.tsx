import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { useIdleSession } from '@/features/session/use-idle-session';

export function PlatformRuntime() {
    const { auth, system } = usePage().props;

    useIdleSession(Boolean(auth.user), system.idleTimeoutSeconds);

    useEffect(() => {
        document.documentElement.dataset.platformTheme = system.theme;
        document.documentElement.dataset.platformName = system.name;

        const favicon =
            document.querySelector<HTMLLinkElement>('link[rel="icon"]');

        if (favicon) {
            favicon.href = system.branding.favicon.url;
        }

        const separator = ' - ';
        const pageTitle = document.title.includes(separator)
            ? document.title.slice(0, document.title.lastIndexOf(separator))
            : document.title;
        document.title =
            pageTitle && pageTitle !== system.name
                ? `${pageTitle}${separator}${system.name}`
                : system.name;
    }, [system]);

    return null;
}
