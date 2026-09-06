import {
    Camera,
    Check,
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    Loader2,
    Search,
    Trash2,
    UploadCloud,
    VideoOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ImageGalleryPickerProps, MediaAssetDto } from '@/types';

type GalleryTab = 'library' | 'upload' | 'camera';

type MediaResponse = {
    data: MediaAssetDto[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
    };
};

function csrfToken(): string {
    const value = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('XSRF-TOKEN='))
        ?.slice('XSRF-TOKEN='.length);

    return value ? decodeURIComponent(value) : '';
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uploadError(xhr: XMLHttpRequest): string {
    try {
        const body = JSON.parse(xhr.responseText) as {
            message?: string;
            errors?: Record<string, string[]>;
        };

        return (
            body.errors?.file?.[0] ??
            body.message ??
            'The image could not be uploaded.'
        );
    } catch {
        return xhr.status === 429
            ? 'Too many uploads. Wait a minute, then try again.'
            : 'The image could not be uploaded.';
    }
}

export function ImageGalleryPicker({
    open,
    onOpenChange,
    value,
    onChange,
    onConfirm,
    title = 'Choose an image',
}: ImageGalleryPickerProps) {
    const [tab, setTab] = useState<GalleryTab>('library');
    const [assets, setAssets] = useState<MediaAssetDto[]>([]);
    const [selected, setSelected] = useState<MediaAssetDto | null>(value);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const capturedUrlRef = useRef<string | null>(null);
    const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(
        null,
    );
    const [cameraState, setCameraState] = useState<
        'idle' | 'starting' | 'live' | 'captured' | 'error'
    >('idle');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [cameraId, setCameraId] = useState('');
    const [capturedFile, setCapturedFile] = useState<File | null>(null);

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const clearCapture = useCallback(() => {
        if (capturedUrlRef.current) {
            URL.revokeObjectURL(capturedUrlRef.current);
        }

        capturedUrlRef.current = null;
        setCapturedPreviewUrl(null);
        setCapturedFile(null);
    }, []);

    const loadAssets = useCallback(
        async (requestedPage: number, requestedSearch: string) => {
            setLoading(true);
            setError(null);

            try {
                const query = new URLSearchParams({
                    page: String(requestedPage),
                });

                if (requestedSearch) {
                    query.set('search', requestedSearch);
                }

                const response = await fetch(`/media-assets?${query}`, {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    throw new Error('Your media library could not be loaded.');
                }

                const body = (await response.json()) as MediaResponse;
                setAssets(body.data);
                setMeta(body.meta);
            } catch (reason) {
                setError(
                    reason instanceof Error
                        ? reason.message
                        : 'Your media library could not be loaded.',
                );
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    useEffect(() => {
        if (!open) {
            return;
        }

        const task = window.setTimeout(() => {
            setSelected(value);
            setTab('library');
            setPage(1);
            setSearch('');
            setSearchInput('');
            setError(null);
            void loadAssets(1, '');
        }, 0);

        return () => window.clearTimeout(task);
    }, [loadAssets, open, value]);

    useEffect(
        () => () => {
            stopCamera();

            if (capturedUrlRef.current) {
                URL.revokeObjectURL(capturedUrlRef.current);
            }
        },
        [stopCamera],
    );

    const uploadFile = useCallback(
        (file: File, source: 'upload' | 'camera') => {
            setError(null);
            setProgress(0);

            return new Promise<MediaAssetDto>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                const body = new FormData();
                body.append('file', file);
                body.append('source', source);
                xhr.open('POST', '/media-assets');
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xhr.setRequestHeader('X-XSRF-TOKEN', csrfToken());
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        setProgress(
                            Math.round((event.loaded / event.total) * 100),
                        );
                    }
                });
                xhr.addEventListener('load', () => {
                    setProgress(null);

                    if (xhr.status !== 201) {
                        reject(new Error(uploadError(xhr)));

                        return;
                    }

                    const response = JSON.parse(xhr.responseText) as {
                        data: MediaAssetDto;
                    };
                    resolve(response.data);
                });
                xhr.addEventListener('error', () => {
                    setProgress(null);
                    reject(
                        new Error(
                            'The upload was interrupted. Check your connection and try again.',
                        ),
                    );
                });
                xhr.send(body);
            });
        },
        [],
    );

    const acceptUpload = async (
        file: File,
        source: 'upload' | 'camera' = 'upload',
    ) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError('Choose a JPEG, PNG, or WebP image.');

            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Choose an image no larger than 5 MB.');

            return;
        }

        try {
            const asset = await uploadFile(file, source);
            setSelected(asset);
            onChange(asset);
            setTab('library');
            setPage(1);
            await loadAssets(1, '');
            setSearch('');
            setSearchInput('');
            stopCamera();
            clearCapture();
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : 'The image could not be uploaded.',
            );
        }
    };

    const startCamera = useCallback(
        async (deviceId = cameraId) => {
            stopCamera();
            clearCapture();
            setCameraError(null);

            const localHost = ['localhost', '127.0.0.1'].includes(
                window.location.hostname,
            );

            if (
                (!window.isSecureContext && !localHost) ||
                !navigator.mediaDevices?.getUserMedia
            ) {
                setCameraState('error');
                setCameraError(
                    'Camera access requires HTTPS or localhost and a supported browser. You can upload a file instead.',
                );

                return;
            }

            setCameraState('starting');

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: deviceId
                        ? { deviceId: { exact: deviceId } }
                        : { facingMode: 'environment' },
                    audio: false,
                });
                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }

                const devices = await navigator.mediaDevices.enumerateDevices();
                setCameras(
                    devices.filter((device) => device.kind === 'videoinput'),
                );
                setCameraState('live');
            } catch (reason) {
                setCameraState('error');
                setCameraError(
                    reason instanceof DOMException &&
                        reason.name === 'NotAllowedError'
                        ? 'Camera permission was denied. Allow access in your browser or upload a file instead.'
                        : 'No usable camera was found. You can upload a file instead.',
                );
            }
        },
        [cameraId, clearCapture, stopCamera],
    );

    useEffect(() => {
        if (!open || tab !== 'camera') {
            return;
        }

        const task = window.setTimeout(() => void startCamera(), 0);

        return () => {
            window.clearTimeout(task);
            stopCamera();
        };
    }, [open, startCamera, stopCamera, tab]);

    const selectTab = (next: GalleryTab) => {
        if (tab === 'camera') {
            stopCamera();
        }

        setTab(next);
        setError(null);
    };

    const capture = () => {
        const video = videoRef.current;

        if (!video || video.videoWidth < 1 || video.videoHeight < 1) {
            setCameraError(
                'The camera is not ready yet. Wait a moment and try again.',
            );

            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');

        if (!context) {
            setCameraError('This browser could not capture the camera frame.');

            return;
        }

        context.drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    setCameraError('The camera frame could not be captured.');

                    return;
                }

                stopCamera();
                const file = new File([blob], `camera-${Date.now()}.jpg`, {
                    type: 'image/jpeg',
                });
                const url = URL.createObjectURL(file);
                capturedUrlRef.current = url;
                setCapturedPreviewUrl(url);
                setCapturedFile(file);
                setCameraState('captured');
            },
            'image/jpeg',
            0.9,
        );
    };

    const removeSelected = async () => {
        if (!selected) {
            return;
        }

        setError(null);
        const response = await fetch(`/media-assets/${selected.id}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': csrfToken(),
            },
        });

        if (!response.ok) {
            const message =
                response.status === 422
                    ? 'This image is assigned and cannot be deleted yet.'
                    : 'The image could not be deleted.';
            setError(message);

            return;
        }

        setSelected(null);
        onChange(null);
        await loadAssets(page, search);
    };

    const close = (nextOpen: boolean) => {
        if (!nextOpen) {
            stopCamera();
            clearCapture();
        }

        onOpenChange(nextOpen);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={close}>
                <DialogContent className="flex h-[min(50rem,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
                    <DialogHeader className="border-b border-border px-5 py-4 text-left sm:px-6">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            Choose one of your uploads, add a file, or capture a
                            photo.
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        className="flex border-b border-border px-3 sm:px-5"
                        role="tablist"
                        aria-label="Image sources"
                    >
                        {(
                            [
                                ['library', ImageIcon, 'My uploads'],
                                ['upload', UploadCloud, 'Upload'],
                                ['camera', Camera, 'Camera'],
                            ] as const
                        ).map(([key, Icon, label]) => (
                            <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={tab === key}
                                onClick={() => selectTab(key)}
                                className={cn(
                                    'relative inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                                    tab === key &&
                                        'text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary',
                                )}
                            >
                                <Icon className="size-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div
                            className="mx-5 mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {tab === 'library' && (
                            <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_17rem]">
                                <div className="min-w-0 p-5 sm:p-6">
                                    <form
                                        className="relative mb-5"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            const next = searchInput.trim();
                                            setSearch(next);
                                            setPage(1);
                                            void loadAssets(1, next);
                                        }}
                                    >
                                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={searchInput}
                                            onChange={(event) =>
                                                setSearchInput(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Search your uploads"
                                            aria-label="Search your uploads"
                                            className="pl-9"
                                        />
                                    </form>

                                    {loading ? (
                                        <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
                                            <Loader2 className="mr-2 size-4 animate-spin motion-reduce:animate-none" />
                                            Loading your images…
                                        </div>
                                    ) : assets.length === 0 ? (
                                        <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                                            <div className="max-w-xs">
                                                <ImageIcon className="mx-auto size-8 text-muted-foreground" />
                                                <p className="mt-3 text-sm font-semibold">
                                                    No images found
                                                </p>
                                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                    {search
                                                        ? 'Try a different name.'
                                                        : 'Upload your first image or use the camera.'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                                            {assets.map((asset) => {
                                                const active =
                                                    selected?.id === asset.id;

                                                return (
                                                    <button
                                                        key={asset.id}
                                                        type="button"
                                                        aria-pressed={active}
                                                        onClick={() => {
                                                            setSelected(asset);
                                                            onChange(asset);
                                                        }}
                                                        className={cn(
                                                            'group relative overflow-hidden rounded-lg border border-border bg-muted/25 text-left focus-visible:ring-2 focus-visible:ring-ring',
                                                            active &&
                                                                'border-primary ring-2 ring-primary/25',
                                                        )}
                                                    >
                                                        <span className="block aspect-square overflow-hidden bg-muted">
                                                            <img
                                                                src={
                                                                    asset.thumbnailUrl
                                                                }
                                                                alt=""
                                                                className="size-full object-contain transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none"
                                                            />
                                                        </span>
                                                        <span className="block truncate px-2.5 py-2 text-xs font-medium">
                                                            {asset.name}
                                                        </span>
                                                        {active && (
                                                            <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                                <Check className="size-3.5" />
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {meta.last_page > 1 && (
                                        <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{meta.total} images</span>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    disabled={page <= 1}
                                                    aria-label="Previous image page"
                                                    onClick={() => {
                                                        const next = page - 1;
                                                        setPage(next);
                                                        void loadAssets(
                                                            next,
                                                            search,
                                                        );
                                                    }}
                                                >
                                                    <ChevronLeft className="size-4" />
                                                </Button>
                                                <span className="tabular-nums">
                                                    {meta.current_page} /{' '}
                                                    {meta.last_page}
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    disabled={
                                                        page >= meta.last_page
                                                    }
                                                    aria-label="Next image page"
                                                    onClick={() => {
                                                        const next = page + 1;
                                                        setPage(next);
                                                        void loadAssets(
                                                            next,
                                                            search,
                                                        );
                                                    }}
                                                >
                                                    <ChevronRight className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <aside className="border-t border-border bg-muted/25 p-5 lg:border-t-0 lg:border-l">
                                    {selected ? (
                                        <div>
                                            <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-background">
                                                <img
                                                    src={selected.contentUrl}
                                                    alt={selected.name}
                                                    className="size-full object-contain"
                                                />
                                            </div>
                                            <h3 className="mt-4 text-sm font-semibold break-words">
                                                {selected.name}
                                            </h3>
                                            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                                                <dt className="text-muted-foreground">
                                                    Dimensions
                                                </dt>
                                                <dd className="text-right tabular-nums">
                                                    {selected.width} ×{' '}
                                                    {selected.height}
                                                </dd>
                                                <dt className="text-muted-foreground">
                                                    Type
                                                </dt>
                                                <dd className="text-right uppercase">
                                                    {selected.extension}
                                                </dd>
                                                <dt className="text-muted-foreground">
                                                    Size
                                                </dt>
                                                <dd className="text-right tabular-nums">
                                                    {formatBytes(
                                                        selected.sizeBytes,
                                                    )}
                                                </dd>
                                                <dt className="text-muted-foreground">
                                                    Source
                                                </dt>
                                                <dd className="text-right capitalize">
                                                    {selected.source}
                                                </dd>
                                                <dt className="text-muted-foreground">
                                                    Added
                                                </dt>
                                                <dd className="text-right">
                                                    {new Date(
                                                        selected.createdAt,
                                                    ).toLocaleDateString()}
                                                </dd>
                                            </dl>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={selected.assigned}
                                                className="mt-5 text-destructive hover:text-destructive"
                                                onClick={() =>
                                                    setDeleteOpen(true)
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                                {selected.assigned
                                                    ? 'Assigned image'
                                                    : 'Delete image'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            Select an image to see its details.
                                        </p>
                                    )}
                                </aside>
                            </div>
                        )}

                        {tab === 'upload' && (
                            <div className="flex min-h-full items-center justify-center p-5 sm:p-8">
                                <label
                                    className={cn(
                                        'flex min-h-80 w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center transition-colors hover:bg-muted/40',
                                        dragging &&
                                            'border-primary bg-accent/50',
                                    )}
                                    onDragEnter={(event) => {
                                        event.preventDefault();
                                        setDragging(true);
                                    }}
                                    onDragOver={(event) =>
                                        event.preventDefault()
                                    }
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragging(false);
                                        const file =
                                            event.dataTransfer.files[0];

                                        if (file) {
                                            void acceptUpload(file);
                                        }
                                    }}
                                >
                                    {progress === null ? (
                                        <UploadCloud className="size-9 text-muted-foreground" />
                                    ) : (
                                        <Loader2 className="size-9 animate-spin text-primary motion-reduce:animate-none" />
                                    )}
                                    <span className="mt-4 text-sm font-semibold">
                                        Drop an image here or choose a file
                                    </span>
                                    <span className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                                        JPEG, PNG, or WebP up to 5 MB and 8192 ×
                                        8192 pixels.
                                    </span>
                                    {progress !== null && (
                                        <span className="mt-4 text-sm font-medium tabular-nums">
                                            Uploading {progress}%
                                        </span>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        disabled={progress !== null}
                                        onChange={(event) => {
                                            const file =
                                                event.target.files?.[0];

                                            if (file) {
                                                void acceptUpload(file);
                                            }

                                            event.currentTarget.value = '';
                                        }}
                                    />
                                </label>
                            </div>
                        )}

                        {tab === 'camera' && (
                            <div className="flex min-h-full flex-col items-center justify-center p-5 sm:p-8">
                                <div className="w-full max-w-2xl">
                                    {cameras.length > 1 && (
                                        <div className="mb-3 grid gap-2">
                                            <label
                                                id="camera-device-label"
                                                className="text-sm font-medium"
                                            >
                                                Camera
                                            </label>
                                            <Select
                                                value={cameraId}
                                                onValueChange={setCameraId}
                                            >
                                                <SelectTrigger
                                                    className="min-h-11 w-full bg-background"
                                                    aria-labelledby="camera-device-label"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent
                                                    position="popper"
                                                    align="start"
                                                >
                                                    {cameras.map(
                                                        (camera, index) => (
                                                            <SelectItem
                                                                key={
                                                                    camera.deviceId
                                                                }
                                                                value={
                                                                    camera.deviceId
                                                                }
                                                            >
                                                                {camera.label ||
                                                                    `Camera ${index + 1}`}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-foreground/95">
                                        {cameraState === 'captured' &&
                                        capturedPreviewUrl ? (
                                            <img
                                                src={capturedPreviewUrl}
                                                alt="Captured camera preview"
                                                className="size-full object-contain"
                                            />
                                        ) : (
                                            <video
                                                ref={videoRef}
                                                muted
                                                playsInline
                                                className="size-full object-contain"
                                            />
                                        )}
                                        {(cameraState === 'starting' ||
                                            cameraState === 'idle') && (
                                            <div className="absolute inset-0 flex items-center justify-center text-background">
                                                <Loader2 className="size-7 animate-spin motion-reduce:animate-none" />
                                            </div>
                                        )}
                                        {cameraState === 'error' && (
                                            <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-background">
                                                <div className="max-w-sm">
                                                    <VideoOff className="mx-auto size-8" />
                                                    <p className="mt-3 text-sm leading-6">
                                                        {cameraError}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                                        {cameraState === 'live' && (
                                            <Button
                                                type="button"
                                                onClick={capture}
                                            >
                                                <Camera className="size-4" />
                                                Capture photo
                                            </Button>
                                        )}
                                        {cameraState === 'captured' && (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        void startCamera()
                                                    }
                                                >
                                                    Retake
                                                </Button>
                                                <Button
                                                    type="button"
                                                    disabled={progress !== null}
                                                    onClick={() =>
                                                        capturedFile &&
                                                        void acceptUpload(
                                                            capturedFile,
                                                            'camera',
                                                        )
                                                    }
                                                >
                                                    {progress === null
                                                        ? 'Use this photo'
                                                        : `Uploading ${progress}%`}
                                                </Button>
                                            </>
                                        )}
                                        {cameraState === 'error' && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    selectTab('upload')
                                                }
                                            >
                                                Upload a file
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t border-border bg-background px-5 py-4 sm:px-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => close(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={!selected}
                            onClick={() => {
                                if (selected) {
                                    onConfirm(selected);
                                    close(false);
                                }
                            }}
                        >
                            Use selected image
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                destructive
                options={{
                    title: 'Delete this image?',
                    description:
                        'It will be removed from your media library and cannot be recovered.',
                    confirmLabel: 'Delete image',
                }}
                onConfirm={() => void removeSelected()}
            />
        </>
    );
}
