<?php

namespace App\Actions\Media;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class StoreFileAsset
{
    public function __construct(
        private readonly StoreMediaAsset $storeImage,
        private readonly RecordAccessAudit $audit,
        private readonly EnforceFileQuota $fileQuota,
    ) {}

    public function execute(UploadedFile $file, User $actor, ?string $tag = null): MediaAsset
    {
        $mime = (string) $file->getMimeType();
        if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return $this->storeImage->execute($file, 'upload', $actor, 'files', $tag);
        }

        $extension = match ($mime) {
            'application/pdf' => 'pdf',
            'text/csv' => 'csv',
            'text/plain' => strtolower($file->getClientOriginalExtension()) === 'csv' ? 'csv' : 'txt',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
            default => throw ValidationException::withMessages(['file' => 'This file type is not supported.']),
        };

        $diskName = (string) config('media-assets.disk', 'local');
        $directory = 'modules/files/'.now()->format('Y/m');
        $path = $directory.'/'.Str::uuid().'.'.$extension;
        $disk = Storage::disk($diskName);

        try {
            $stored = $disk->putFileAs($directory, $file, basename($path));
        } catch (Throwable $exception) {
            $disk->delete($path);
            throw ValidationException::withMessages(['file' => 'The file could not be stored. Try again.']);
        }
        if ($stored === false) {
            $disk->delete($path);
            throw ValidationException::withMessages(['file' => 'The file could not be stored. Try again.']);
        }

        try {
            return DB::transaction(function () use ($actor, $diskName, $path, $file, $mime, $extension, $tag): MediaAsset {
                User::query()->whereKey($actor->getKey())->lockForUpdate()->firstOrFail();
                $this->fileQuota->execute($actor, (int) $file->getSize());
                $asset = MediaAsset::query()->create([
                    'uploader_id' => $actor->getKey(),
                    'module' => 'files',
                    'tag' => $tag,
                    'disk' => $diskName,
                    'path' => $path,
                    'thumbnail_path' => null,
                    'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
                    'mime_type' => $mime,
                    'extension' => $extension,
                    'size_bytes' => $file->getSize(),
                    'width' => null,
                    'height' => null,
                    'source' => 'upload',
                    'created_by' => $actor->getKey(),
                    'updated_by' => $actor->getKey(),
                ]);

                $this->audit->record(
                    event: 'media.asset.uploaded',
                    actor: $actor,
                    subject: $asset,
                    after: $asset->only(['original_name', 'mime_type', 'size_bytes', 'module', 'tag']),
                );

                return $asset;
            });
        } catch (Throwable $exception) {
            $disk->delete($path);
            throw $exception;
        }
    }
}
