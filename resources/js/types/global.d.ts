import type { Auth } from '@/types/auth';
import type { PlatformBranding, PlatformTheme } from '@/types/system';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            system: {
                name: string;
                timezone: string;
                theme: PlatformTheme;
                idleTimeoutSeconds: number;
                branding: PlatformBranding;
            };
            sidebarOpen: boolean;
            flash?: {
                success?: string | string[] | null;
                error?: string | string[] | null;
                warning?: string | string[] | null;
                info?: string | string[] | null;
                message?: string | string[] | null;
            };
            [key: string]: unknown;
        };
    }
}
