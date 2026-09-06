import { Head, router } from '@inertiajs/react';
import { ImageIcon, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { ImageGalleryPicker } from '@/components/image-gallery-picker';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import type { MediaAssetDto, PlatformImageSlot } from '@/types';

type Props = {
    slots: PlatformImageSlot[];
    canAssign: boolean;
};

function formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PlatformImages({ slots, canAssign }: Props) {
    const [activeSlot, setActiveSlot] = useState<PlatformImageSlot | null>(
        null,
    );
    const [selected, setSelected] = useState<MediaAssetDto | null>(null);
    const [resetSlot, setResetSlot] = useState<PlatformImageSlot | null>(null);

    return (
        <>
            <Head title="Platform images" />

            <div className="settings-workspace overflow-hidden border border-border bg-card text-card-foreground">
                <header className="settings-section flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                            <ImageIcon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="max-w-2xl">
                            <h2 className="text-base font-semibold">
                                Runtime branding
                            </h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Manage the five images shared by the app,
                                sign-in experience, landing page, and browser.
                                Built-in artwork remains available as a safe
                                fallback.
                            </p>
                        </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                        <ShieldCheck className="size-3.5" />
                        {canAssign ? 'Owner controls enabled' : 'View only'}
                    </span>
                </header>

                <div className="border-t border-border">
                    {slots.map((slot) => (
                        <article
                            key={slot.key}
                            className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-b border-border p-5 last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center sm:p-6"
                        >
                            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted/55 p-2 sm:aspect-[4/3] sm:p-3">
                                <img
                                    src={slot.url}
                                    alt={`${slot.label} preview`}
                                    loading="lazy"
                                    decoding="async"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold">
                                        {slot.label}
                                    </h3>
                                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                        {slot.isCustom ? 'Custom' : 'Built in'}
                                    </span>
                                </div>
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                                    {slot.purpose}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span>
                                        Recommended {slot.recommended_aspect}
                                    </span>
                                    {slot.asset && (
                                        <>
                                            <span className="max-w-72 truncate">
                                                {slot.asset.name}
                                            </span>
                                            <span className="tabular-nums">
                                                {slot.asset.width} ×{' '}
                                                {slot.asset.height}
                                            </span>
                                            <span>
                                                {formatBytes(
                                                    slot.asset.sizeBytes,
                                                )}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {canAssign && (
                                <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end">
                                    {slot.isCustom && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="min-h-11"
                                            onClick={() => setResetSlot(slot)}
                                        >
                                            <RefreshCcw className="size-4" />
                                            Reset
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="min-h-11"
                                        onClick={() => {
                                            setSelected(null);
                                            setActiveSlot(slot);
                                        }}
                                    >
                                        Change
                                    </Button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>

                {!canAssign && (
                    <footer className="border-t border-border bg-muted/35 px-5 py-4 text-sm text-muted-foreground sm:px-7">
                        Only an Owner or Super Admin can change platform images.
                        Your personal media library remains private to your
                        account.
                    </footer>
                )}
            </div>

            {canAssign && (
                <ImageGalleryPicker
                    open={activeSlot !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setActiveSlot(null);
                        }
                    }}
                    value={selected}
                    onChange={setSelected}
                    title={
                        activeSlot
                            ? `Choose ${activeSlot.label.toLowerCase()}`
                            : 'Choose an image'
                    }
                    onConfirm={(asset) => {
                        if (!activeSlot) {
                            return;
                        }

                        router.put(
                            `/settings/system/platform-images/${activeSlot.key}`,
                            { asset_id: asset.id },
                            { preserveScroll: true },
                        );
                    }}
                />
            )}

            <ConfirmDialog
                open={resetSlot !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setResetSlot(null);
                    }
                }}
                options={{
                    title: 'Use the built-in image?',
                    description: resetSlot
                        ? `${resetSlot.label} will return to its starter-kit fallback. The uploaded image stays in its owner’s gallery.`
                        : '',
                    confirmLabel: 'Reset image',
                }}
                onConfirm={() => {
                    if (!resetSlot) {
                        return;
                    }

                    router.delete(
                        `/settings/system/platform-images/${resetSlot.key}`,
                        { preserveScroll: true },
                    );
                }}
            />
        </>
    );
}

PlatformImages.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'System settings', href: '/settings/system' },
        { title: 'Platform images', href: '/settings/system/platform-images' },
    ],
};
