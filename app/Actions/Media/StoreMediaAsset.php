<?php

namespace App\Actions\Media;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\MediaAsset;
use App\Models\User;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class StoreMediaAsset
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(UploadedFile $file, string $source, User $actor): MediaAsset
    {
        $bytes = file_get_contents($file->getRealPath());
        $image = is_string($bytes) ? @imagecreatefromstring($bytes) : false;

        if (! $image instanceof GdImage) {
            throw ValidationException::withMessages(['file' => 'The selected file could not be read as an image.']);
        }

        try {
            $width = imagesx($image);
            $height = imagesy($image);
            $maximumDimension = (int) config('media-assets.max_dimension_pixels', 8192);

            if ($width > $maximumDimension || $height > $maximumDimension) {
                throw ValidationException::withMessages([
                    'file' => "Images must be no larger than {$maximumDimension}×{$maximumDimension} pixels.",
                ]);
            }

            $mimeType = (string) $file->getMimeType();
            $extension = match ($mimeType) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                default => throw ValidationException::withMessages([
                    'file' => 'Only JPEG, PNG, and WebP images are supported.',
                ]),
            };

            $normalized = $this->encode($image, $mimeType);
            $thumbnail = $this->thumbnail($image, $mimeType);
        } finally {
            imagedestroy($image);
        }

        $diskName = (string) config('media-assets.disk', 'local');
        $directory = 'media-assets/'.$actor->getKey().'/'.now()->format('Y/m');
        $basename = (string) Str::uuid();
        $path = "{$directory}/{$basename}.{$extension}";
        $thumbnailPath = "{$directory}/{$basename}-thumb.webp";
        $disk = Storage::disk($diskName);

        if (! $disk->put($path, $normalized) || ! $disk->put($thumbnailPath, $thumbnail)) {
            $disk->delete([$path, $thumbnailPath]);
            throw ValidationException::withMessages(['file' => 'The image could not be stored. Please try again.']);
        }

        try {
            return DB::transaction(function () use (
                $actor,
                $diskName,
                $path,
                $thumbnailPath,
                $file,
                $mimeType,
                $extension,
                $normalized,
                $width,
                $height,
                $source,
            ): MediaAsset {
                User::query()->whereKey($actor->getKey())->lockForUpdate()->firstOrFail();

                $assetCount = MediaAsset::query()->where('uploader_id', $actor->getKey())->count();
                $usedBytes = (int) MediaAsset::query()->where('uploader_id', $actor->getKey())->sum('size_bytes');
                $maximumAssets = (int) config('media-assets.per_user_max_assets', 100);
                $maximumBytes = (int) config('media-assets.per_user_max_bytes', 262144000);

                if ($assetCount >= $maximumAssets) {
                    throw ValidationException::withMessages([
                        'file' => "Your media library has reached its {$maximumAssets}-image limit.",
                    ]);
                }

                if ($usedBytes + strlen($normalized) > $maximumBytes) {
                    throw ValidationException::withMessages([
                        'file' => 'Your media library has reached its storage limit.',
                    ]);
                }

                $asset = MediaAsset::query()->create([
                    'uploader_id' => $actor->getKey(),
                    'disk' => $diskName,
                    'path' => $path,
                    'thumbnail_path' => $thumbnailPath,
                    'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 255),
                    'mime_type' => $mimeType,
                    'extension' => $extension,
                    'size_bytes' => strlen($normalized),
                    'width' => $width,
                    'height' => $height,
                    'source' => $source,
                    'created_by' => $actor->getKey(),
                    'updated_by' => $actor->getKey(),
                ]);

                $this->audit->record(
                    event: 'media.asset.uploaded',
                    actor: $actor,
                    subject: $asset,
                    after: $asset->only(['original_name', 'mime_type', 'size_bytes', 'width', 'height', 'source']),
                );

                return $asset;
            });
        } catch (Throwable $exception) {
            $disk->delete([$path, $thumbnailPath]);
            throw $exception;
        }
    }

    private function encode(GdImage $image, string $mimeType): string
    {
        ob_start();

        $written = match ($mimeType) {
            'image/jpeg' => imagejpeg($image, null, 88),
            'image/png' => imagepng($image, null, 6),
            'image/webp' => imagewebp($image, null, 86),
            default => false,
        };

        $contents = ob_get_clean();

        if (! $written || ! is_string($contents)) {
            throw ValidationException::withMessages(['file' => 'The image could not be normalized.']);
        }

        return $contents;
    }

    private function thumbnail(GdImage $image, string $mimeType): string
    {
        $maximum = (int) config('media-assets.thumbnail_size_pixels', 480);
        $scale = min(1, $maximum / max(imagesx($image), imagesy($image)));
        $width = max(1, (int) round(imagesx($image) * $scale));
        $height = max(1, (int) round(imagesy($image) * $scale));
        $thumbnail = imagecreatetruecolor($width, $height);

        if (! $thumbnail instanceof GdImage) {
            throw ValidationException::withMessages(['file' => 'The image thumbnail could not be created.']);
        }

        try {
            if ($mimeType !== 'image/jpeg') {
                imagealphablending($thumbnail, false);
                imagesavealpha($thumbnail, true);
                $transparent = imagecolorallocatealpha($thumbnail, 0, 0, 0, 127);

                if ($transparent === false) {
                    throw ValidationException::withMessages(['file' => 'The image thumbnail could not be prepared.']);
                }

                imagefill($thumbnail, 0, 0, $transparent);
            }

            imagecopyresampled(
                $thumbnail,
                $image,
                0,
                0,
                0,
                0,
                $width,
                $height,
                imagesx($image),
                imagesy($image),
            );

            ob_start();
            $written = imagewebp($thumbnail, null, 80);
            $contents = ob_get_clean();

            if (! $written || ! is_string($contents)) {
                throw ValidationException::withMessages(['file' => 'The image thumbnail could not be encoded.']);
            }

            return $contents;
        } finally {
            imagedestroy($thumbnail);
        }
    }
}
