import { Form } from '@inertiajs/react';
import { Globe2, ShieldAlert } from 'lucide-react';
import InputError from '@/components/input-error';
import { ActionLink } from '@/components/action-link';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ReferenceDataFormProps = {
    resource: 'country' | 'timezone';
    action: string;
    method: 'post' | 'patch';
    initialCode?: string;
    initialName?: string;
    submitLabel: string;
    cancelHref: string;
};

export default function ReferenceDataForm({
    resource,
    action,
    method,
    initialCode = '',
    initialName = '',
    submitLabel,
    cancelHref,
}: ReferenceDataFormProps) {
    const isCountry = resource === 'country';

    return (
        <Card className="max-w-3xl overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/15 px-4 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-link/10 text-link">
                        <Globe2 className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        <CardTitle>
                            {isCountry ? 'Country details' : 'Timezone details'}
                        </CardTitle>
                        <CardDescription className="mt-1.5 max-w-xl leading-5">
                            {isCountry
                                ? 'Maintain the country code and display name available to FieldOps.'
                                : 'Maintain a valid IANA timezone identifier available to system settings.'}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <Form action={action} method={method}>
                {({ processing, errors }) => (
                    <>
                        <CardContent className="space-y-6 p-4 sm:p-6">
                            {isCountry ? (
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <Label htmlFor="country-code">
                                            Country code
                                        </Label>
                                        <span className="text-xs text-muted-foreground">
                                            ISO alpha-2
                                        </span>
                                    </div>
                                    <Input
                                        id="country-code"
                                        name="code"
                                        defaultValue={initialCode}
                                        maxLength={2}
                                        autoCapitalize="characters"
                                        placeholder="PH"
                                        className="h-11 max-w-32 font-mono uppercase"
                                        aria-invalid={Boolean(errors.code)}
                                        required
                                    />
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        Use exactly two letters. The value is
                                        normalized to uppercase when saved.
                                    </p>
                                    <InputError message={errors.code} />
                                </div>
                            ) : null}

                            <div className="grid gap-2">
                                <Label htmlFor={`${resource}-name`}>
                                    {isCountry ? 'Name' : 'Timezone'}
                                </Label>
                                <Input
                                    id={`${resource}-name`}
                                    name="name"
                                    defaultValue={initialName}
                                    placeholder={
                                        isCountry
                                            ? 'Philippines'
                                            : 'Asia/Manila'
                                    }
                                    className={
                                        isCountry ? 'h-11' : 'h-11 font-mono'
                                    }
                                    aria-invalid={Boolean(errors.name)}
                                    required
                                />
                                <p className="text-xs leading-5 text-muted-foreground">
                                    {isCountry
                                        ? 'Use the English display name shown in country pickers.'
                                        : 'Use an identifier recognized by PHP DateTimeZone, such as Asia/Manila or UTC.'}
                                </p>
                                <InputError message={errors.name} />
                            </div>
                        </CardContent>

                        <CardFooter className="flex-col items-stretch gap-4 border-t border-border bg-muted/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="flex max-w-md items-start gap-2.5 text-xs leading-5 text-muted-foreground">
                                <ShieldAlert
                                    className="mt-0.5 size-4 shrink-0 text-link"
                                    aria-hidden="true"
                                />
                                <p>
                                    <span className="font-medium text-foreground">
                                        Security check:
                                    </span>{' '}
                                    changes require password confirmation and
                                    are recorded in the access audit history.
                                </p>
                            </div>
                            <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                                <ActionLink href={cancelHref} variant="ghost">
                                    Cancel
                                </ActionLink>
                                <Button type="submit" disabled={processing}>
                                    {submitLabel}
                                </Button>
                            </div>
                        </CardFooter>
                    </>
                )}
            </Form>
        </Card>
    );
}
