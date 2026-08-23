import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { landingAssets } from '@/features/landing/data';

export default function Register({
    passwordRules,
}: {
    passwordRules?: string;
}) {
    return (
        <>
            <Head title="Request an account" />
            <Form
                action="/register"
                method="post"
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="register-name">Full name</Label>
                                <Input
                                    id="register-name"
                                    name="name"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    placeholder="Full name"
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="register-email">
                                    Email address
                                </Label>
                                <Input
                                    id="register-email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="register-password">
                                    Password
                                </Label>
                                <PasswordInput
                                    id="register-password"
                                    name="password"
                                    required
                                    autoComplete="new-password"
                                    placeholder="Password"
                                />
                                <InputError message={errors.password} />
                                {passwordRules && (
                                    <p className="text-xs text-muted-foreground">
                                        {passwordRules}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="register-password-confirmation">
                                    Confirm password
                                </Label>
                                <PasswordInput
                                    id="register-password-confirmation"
                                    name="password_confirmation"
                                    required
                                    autoComplete="new-password"
                                    placeholder="Repeat password"
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>
                            <Button
                                className="mt-2 w-full"
                                disabled={processing}
                            >
                                Submit registration
                            </Button>
                        </div>
                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink href="/login">Log in</TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Request access to FieldOps',
    description:
        'Submit your details for administrator review before using the workspace.',
    artwork: {
        src: landingAssets.fieldWorkerServiceVan,
        alt: 'Field worker checking a service van beside a city water tower',
    },
};
