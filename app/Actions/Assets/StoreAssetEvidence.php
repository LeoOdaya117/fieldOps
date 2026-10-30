<?php

namespace App\Actions\Assets;

use App\Actions\Media\StoreMediaAsset;
use App\Actions\Rbac\RecordAccessAudit;
use App\Models\Asset;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class StoreAssetEvidence
{
    public function __construct(
        private readonly StoreMediaAsset $storeImage,
        private readonly RecordAccessAudit $audit,
    ) {}

    public function execute(Asset $asset, UploadedFile $file, User $actor): MediaAsset
    {
        $mime = (string) $file->getMimeType();
        $extension = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'application/pdf' => 'pdf',
            'text/csv' => 'csv',
            'text/plain' => strtolower($file->getClientOriginalExtension()) === 'csv' ? 'csv' : 'txt',
            'application/vnd.ms-excel' => 'xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
            default => throw ValidationException::withMessages(['file' => 'This file type is not supported.']),
        };

        $diskName = (string) config('media-assets.disk', 'local');
        $directory = 'modules/asset_evidence/'.now()->format('Y/m');
        $path = null;
        $created = null;

        try {
            return DB::transaction(function () use ($actor, $asset, $directory, $diskName, $extension, $file, $mime, &$created, &$path): MediaAsset {
                $lockedAsset = Asset::query()->whereKey($asset->getKey())->lockForUpdate()->firstOrFail();
                $allEvidence = MediaAsset::withTrashed()
                    ->withoutGlobalScope('record_status')
                    ->where('module', 'asset_evidence')
                    ->where('asset_id', $lockedAsset->getKey());

                if ((clone $allEvidence)->count() >= (int) config('media-assets.asset_evidence_max_files', 100)) {
                    throw ValidationException::withMessages(['file' => 'This asset has reached its evidence file limit.']);
                }

                if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                    $created = $this->storeImage->execute($file, 'upload', $actor, 'asset_evidence', null, (int) $lockedAsset->getKey());
                } else {
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

                    $created = MediaAsset::query()->create([
                        'asset_id' => $lockedAsset->getKey(),
                        'uploader_id' => $actor->getKey(),
                        'module' => 'asset_evidence',
                        'disk' => $diskName,
                        'path' => $path,
                        'thumbnail_path' => null,
                        'original_name' => $this->originalName($file),
                        'mime_type' => $mime,
                        'extension' => $extension,
                        'size_bytes' => (int) $file->getSize(),
                        'width' => null,
                        'height' => null,
                        'source' => 'upload',
                        'created_by' => $actor->getKey(),
                        'updated_by' => $actor->getKey(),
                    ]);
                }

                if ((int) $allEvidence->sum('size_bytes') > (int) config('media-assets.asset_evidence_max_bytes', 1073741824)) {
                    throw ValidationException::withMessages(['file' => 'This asset has reached its evidence storage limit.']);
                }

                $this->audit->record(
                    'asset.evidence.attached',
                    $actor,
                    $lockedAsset,
                    null,
                    [...$this->snapshot($created), '_actor' => $this->actorSnapshot($actor)],
                );

                return $created;
            });
        } catch (Throwable $exception) {
            if ($created instanceof MediaAsset) {
                $paths = array_filter(
                    [$created->path, $created->thumbnail_path],
                    static fn (?string $path): bool => $path !== null,
                );
                Storage::disk($created->disk)->delete($paths);
            } elseif ($path !== null) {
                Storage::disk($diskName)->delete($path);
            }

            throw $exception;
        }
    }

    /** @return array{name: string, mime_type: string, size_bytes: int, media_asset_id: int} */
    public function snapshot(MediaAsset $asset): array
    {
        return [
            'name' => $asset->original_name,
            'mime_type' => $asset->mime_type,
            'size_bytes' => (int) $asset->size_bytes,
            'media_asset_id' => (int) $asset->getKey(),
        ];
    }

    /** @return array{name: string, email: string} */
    public function actorSnapshot(User $actor): array
    {
        return ['name' => (string) $actor->name, 'email' => (string) $actor->email];
    }

    private function originalName(UploadedFile $file): string
    {
        $name = basename($file->getClientOriginalName());
        $name = preg_replace('/[\x00-\x1F\x7F]/', '', $name) ?: 'evidence';

        return mb_substr($name, 0, 255);
    }
}
