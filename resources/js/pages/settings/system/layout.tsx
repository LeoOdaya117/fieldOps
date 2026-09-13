import { Form, Head } from '@inertiajs/react';
import { Check, LayoutTemplate } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlatformTheme, PlatformThemeOption } from '@/types';

function PreviewLines() {
    return (
        <>
            <span />
            <span />
            <span />
            <span />
        </>
    );
}

function ThemePreview({ theme }: { theme: PlatformTheme }) {
    return (
        <div
            className="relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-background shadow-xs"
            aria-hidden="true"
        >
            {theme === 'canvas' && (
                <div className="absolute inset-2 flex gap-2 rounded-md bg-muted p-1.5">
                    <div className="flex w-1/4 flex-col gap-1 rounded-sm bg-sidebar p-1.5 [&>span]:h-1.5 [&>span]:rounded-sm [&>span]:bg-sidebar-accent">
                        <PreviewLines />
                    </div>
                    <div className="flex-1 rounded-md border border-border bg-card p-2">
                        <div className="mb-2 h-2 w-2/5 rounded-sm bg-foreground/75" />
                        <div className="h-[68%] rounded-sm bg-muted" />
                    </div>
                </div>
            )}
            {theme === 'atlas' && (
                <div className="absolute inset-0 flex flex-col">
                    <div className="h-[18%] bg-foreground" />
                    <div className="flex flex-1">
                        <div className="flex w-[27%] flex-col gap-1 border-r border-border bg-sidebar p-2 [&>span]:h-1.5 [&>span]:bg-sidebar-accent">
                            <PreviewLines />
                        </div>
                        <div className="flex-1 p-2">
                            <div className="mb-2 h-2 w-1/2 bg-foreground/75" />
                            <div className="h-[65%] border border-border bg-card" />
                        </div>
                    </div>
                </div>
            )}
            {theme === 'rail' && (
                <div className="absolute inset-0 flex">
                    <div className="flex w-[14%] flex-col items-center gap-2 border-r border-border bg-sidebar py-2 [&>span]:size-2 [&>span]:rounded-sm [&>span]:bg-sidebar-accent">
                        <PreviewLines />
                    </div>
                    <div className="flex flex-1 flex-col">
                        <div className="h-[18%] border-b border-border bg-card" />
                        <div className="flex-1 p-3">
                            <div className="mb-2 h-2 w-1/3 rounded-sm bg-foreground/75" />
                            <div className="h-[65%] rounded-sm bg-muted" />
                        </div>
                    </div>
                </div>
            )}
            {theme === 'navigator' && (
                <div className="absolute inset-0 flex">
                    <div className="flex w-[12%] flex-col items-center gap-2 bg-foreground py-2 [&>span]:size-2 [&>span]:rounded-sm [&>span]:bg-background/55">
                        <PreviewLines />
                    </div>
                    <div className="w-1/4 border-r border-border bg-sidebar p-2">
                        <div className="mb-3 h-2 w-2/3 rounded-sm bg-foreground/70" />
                        <div className="space-y-1.5 [&>span]:block [&>span]:h-1.5 [&>span]:rounded-sm [&>span]:bg-sidebar-accent">
                            <PreviewLines />
                        </div>
                    </div>
                    <div className="flex-1 p-3">
                        <div className="mb-2 h-2 w-2/5 rounded-sm bg-foreground/75" />
                        <div className="h-[65%] rounded-sm border border-border bg-card" />
                    </div>
                </div>
            )}
            {theme === 'horizon' && (
                <div className="absolute inset-0 flex flex-col">
                    <div className="h-[18%] border-b border-border bg-card" />
                    <div className="flex h-[16%] items-center gap-3 border-b border-border px-3 [&>span]:h-1.5 [&>span]:w-10 [&>span]:rounded-sm [&>span]:bg-accent">
                        <PreviewLines />
                    </div>
                    <div className="flex-1 p-3">
                        <div className="mb-2 h-2 w-1/3 rounded-sm bg-foreground/75" />
                        <div className="h-[62%] rounded-sm border border-border bg-card" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PlatformLayoutSettings({
    currentTheme,
    themes,
}: {
    currentTheme: PlatformTheme;
    themes: PlatformThemeOption[];
}) {
    const [selectedTheme, setSelectedTheme] = useState(currentTheme);

    return (
        <>
            <Head title="Layout themes" />
            <Form
                action="/settings/system/layout"
                method="patch"
                options={{ preserveScroll: true }}
                className="max-w-5xl"
            >
                {({ errors, processing }) => (
                    <div className="settings-workspace overflow-hidden border border-border bg-card text-card-foreground">
                        <input
                            type="hidden"
                            name="theme"
                            value={selectedTheme}
                        />
                        <header className="settings-section flex items-start gap-3 border-b border-border">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                                <LayoutTemplate className="size-4" />
                            </span>
                            <div className="max-w-2xl">
                                <h2 className="text-base font-semibold">
                                    Choose the application shell
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    Layout changes navigation and workspace
                                    structure for everyone. Personal light and
                                    dark appearance stays separate.
                                </p>
                            </div>
                        </header>
                        <fieldset className="settings-section">
                            <legend className="sr-only">
                                Application layout
                            </legend>
                            <div className="grid gap-4 md:grid-cols-2">
                                {themes.map((theme) => {
                                    const selected =
                                        selectedTheme === theme.value;
                                    const current =
                                        currentTheme === theme.value;

                                    return (
                                        <label
                                            key={theme.value}
                                            className={cn(
                                                'group cursor-pointer rounded-xl border border-border bg-background p-3.5 transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/35 hover:border-ring/55 motion-reduce:transition-none',
                                                selected &&
                                                    'border-primary ring-2 ring-primary/15',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="theme-choice"
                                                value={theme.value}
                                                checked={selected}
                                                onChange={() =>
                                                    setSelectedTheme(
                                                        theme.value,
                                                    )
                                                }
                                                className="sr-only"
                                            />
                                            <ThemePreview theme={theme.value} />
                                            <div className="mt-4 flex items-start gap-3">
                                                <span
                                                    className={cn(
                                                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-input',
                                                        selected &&
                                                            'border-primary bg-primary text-primary-foreground',
                                                    )}
                                                >
                                                    {selected && (
                                                        <Check className="size-3" />
                                                    )}
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-semibold">
                                                            {theme.label}
                                                        </h3>
                                                        {current && (
                                                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                                        {theme.description}
                                                    </p>
                                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                                        {theme.traits.map(
                                                            (trait) => (
                                                                <span
                                                                    key={trait}
                                                                    className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
                                                                >
                                                                    {trait}
                                                                </span>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <InputError
                                id="theme-error"
                                className="mt-3"
                                message={errors.theme}
                            />
                        </fieldset>
                        <footer className="flex flex-col gap-3 border-t border-border bg-muted/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                            <p className="text-xs text-muted-foreground">
                                The new layout appears after saving.
                            </p>
                            <Button
                                disabled={
                                    processing || selectedTheme === currentTheme
                                }
                            >
                                {processing ? 'Applying…' : 'Apply layout'}
                            </Button>
                        </footer>
                    </div>
                )}
            </Form>
        </>
    );
}

PlatformLayoutSettings.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'System settings', href: '/settings/system' },
        { title: 'Layout themes', href: '/settings/system/layout' },
    ],
};
