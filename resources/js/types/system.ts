export type PlatformTheme =
    'canvas' | 'atlas' | 'rail' | 'navigator' | 'horizon';

export type PlatformThemeOption = {
    value: PlatformTheme;
    label: string;
    description: string;
    traits: string[];
};

export type PlatformBrandingItem = {
    url: string;
    version: number;
    is_custom: boolean;
};

export type PlatformBranding = Record<
    | 'brand_mark'
    | 'brand_wordmark'
    | 'brand_wordmark_on_dark'
    | 'favicon'
    | 'image_placeholder',
    PlatformBrandingItem
>;

export type PlatformImageSlot = {
    key: keyof PlatformBranding;
    label: string;
    purpose: string;
    recommended_aspect: string;
    fallback_url: string;
    url: string;
    isCustom: boolean;
    asset: Omit<
        MediaAssetDto,
        'contentUrl' | 'thumbnailUrl' | 'assigned'
    > | null;
};

export type MediaAssetDto = FileDto;

export type MapCoordinate = {
    latitude: number;
    longitude: number;
};

export type MapboxMapProps = {
    value: MapCoordinate | null;
    onChange?: (coordinate: MapCoordinate) => void;
    interactive?: boolean;
    initialCenter?: MapCoordinate;
    initialZoom?: number;
    ariaLabel?: string;
    className?: string;
};

export type ImageGalleryPickerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: MediaAssetDto | null;
    onChange: (asset: MediaAssetDto | null) => void;
    onConfirm: (asset: MediaAssetDto) => void;
    title?: string;
};
import type { FileDto } from './files';
