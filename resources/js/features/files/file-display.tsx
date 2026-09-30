import {
    FileArchive,
    FileImage,
    FileSpreadsheet,
    FileText,
    File as FileIcon,
} from 'lucide-react';
import type { FileDto } from '@/types';

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);

    return `${(bytes / 1024 ** power).toFixed(1)} ${units[power - 1]}`;
}

export function fileKind(
    file: FileDto,
): 'image' | 'pdf' | 'table' | 'archive' | 'other' {
    if (file.mimeType.startsWith('image/')) {
        return 'image';
    }

    if (file.mimeType === 'application/pdf') {
        return 'pdf';
    }

    if (['csv', 'xls', 'xlsx'].includes(file.extension.toLowerCase())) {
        return 'table';
    }

    if (['zip', 'rar', '7z'].includes(file.extension.toLowerCase())) {
        return 'archive';
    }

    return 'other';
}

export function FileThumbnail({
    file,
    className = '',
}: {
    file: FileDto;
    className?: string;
}) {
    const kind = fileKind(file);
    const Icon =
        kind === 'image'
            ? FileImage
            : kind === 'pdf'
              ? FileText
              : kind === 'table'
                ? FileSpreadsheet
                : kind === 'archive'
                  ? FileArchive
                  : FileIcon;

    return (
        <span
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground ${className}`}
        >
            {kind === 'image' && file.thumbnailUrl ? (
                <img
                    src={file.thumbnailUrl}
                    alt=""
                    className="size-full object-cover"
                />
            ) : (
                <Icon className="size-5" aria-hidden="true" />
            )}
        </span>
    );
}

export function FileStatus({ value }: { value: number }) {
    const active = Number(value) === 1;

    return (
        <span className={active ? 'text-success' : 'text-muted-foreground'}>
            <span
                aria-hidden="true"
                className="mr-1.5 inline-block size-1.5 rounded-full bg-current align-middle"
            />
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}
