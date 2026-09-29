export type FileDto = {
    token: string;
    name: string;
    mimeType: string;
    extension: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    module: string;
    tag: string | null;
    recordStatus: number;
    createdAt: string;
    contentUrl: string;
    thumbnailUrl: string | null;
    downloadUrl: string;
    previewDataUrl: string | null;
    recordStatusUrl: string | null;
    assigned: boolean;
    updateUrl?: string | null;
    canUpdate?: boolean;
    canDelete?: boolean;
    source?: 'upload' | 'camera';
};

export type FilePagination = {
    data: FileDto[];
    links?: { url: string | null; label: string; active: boolean }[];
    meta?: {
        current_page: number;
        last_page: number;
        total: number;
        from?: number | null;
        to?: number | null;
    };
    current_page?: number;
    last_page?: number;
    total?: number;
    per_page?: number;
    from?: number | null;
    to?: number | null;
};
