import type { UrlMethodPair } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import { Passkeys } from '@laravel/passkeys';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { KeyRound } from 'lucide-react';
import { useEffect } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import type { BrowserLocation } from '@/hooks/use-browser-location';

type Props = {
    routes?: {
        options: UrlMethodPair;
        submit: UrlMethodPair;
    };
    label?: string;
    loadingLabel?: string;
    separator?: string;
    location?: BrowserLocation | null;
};

export default function PasskeyVerify({
    routes,
    label,
    loadingLabel,
    separator,
    location = null,
}: Props = {}) {
    useEffect(() => {
        Passkeys.configure({
            fetch: {
                headers: {
                    'X-Browser-Location-Latitude':
                        location === null ? '' : String(location.latitude),
                    'X-Browser-Location-Longitude':
                        location === null ? '' : String(location.longitude),
                    'X-Browser-Location-Accuracy':
                        location === null ? '' : String(location.accuracy),
                    'X-Browser-Location-Timezone': location?.timezone ?? '',
                },
            },
        });
    }, [location]);

    const { verify, isLoading, error, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? '/dashboard');
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <div className="grid gap-2">
                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={verify}
                    disabled={isLoading}
                >
                    {isLoading ? <Spinner /> : <KeyRound className="h-4 w-4" />}
                    {isLoading
                        ? (loadingLabel ?? 'Authenticating...')
                        : (label ?? 'Sign in with a passkey')}
                </Button>
                {error && (
                    <InputError message={error} className="text-center" />
                )}
            </div>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        {separator ?? 'Or continue with email'}
                    </span>
                </div>
            </div>
        </>
    );
}
