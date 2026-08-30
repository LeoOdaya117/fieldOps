// Components
import { Form, Head, router } from '@inertiajs/react';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
    browserLocationPayload,
    requestBrowserLocation,
} from '@/hooks/use-browser-location';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();

        if (loggingOut) {
            return;
        }

        setLoggingOut(true);
        const location = await requestBrowserLocation();

        router.post(logout(), browserLocationPayload(location), {
            onFinish: () => setLoggingOut(false),
        });
    };

    return (
        <>
            <Head title="Email verification" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-success">
                    A new verification link has been sent to the email address
                    you provided during registration.
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            Resend verification email
                        </Button>

                        <button
                            type="button"
                            className="mx-auto block cursor-pointer text-sm text-foreground underline decoration-border underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current"
                            onClick={handleLogout}
                            disabled={loggingOut}
                            aria-busy={loggingOut}
                        >
                            {loggingOut ? 'Logging out…' : 'Log out'}
                        </button>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description:
        'Please verify your email address by clicking on the link we just emailed to you.',
};
