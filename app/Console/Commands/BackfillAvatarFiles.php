<?php

namespace App\Console\Commands;

use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class BackfillAvatarFiles extends Command
{
    protected $signature = 'files:backfill-avatars';

    protected $description = 'Copy legacy public avatars to tokenized private media without deleting source files';

    public function handle(): int
    {
        $migrated = 0;
        $skipped = 0;
        $diskName = (string) config('media-assets.disk', 'local');
        $private = Storage::disk($diskName);
        $public = Storage::disk('public');

        User::withTrashed()->whereNotNull('avatar_path')->whereNull('avatar_media_asset_id')
            ->orderBy('id')->chunkById(100, function ($users) use ($public, $private, $diskName, &$migrated, &$skipped): void {
                foreach ($users as $user) {
                    $legacy = (string) $user->avatar_path;
                    if (! str_starts_with($legacy, 'users/') || str_contains($legacy, '..') || ! $public->exists($legacy)) {
                        $this->warn("User {$user->getKey()}: source unavailable; legacy reference retained.");
                        $skipped++;

                        continue;
                    }

                    $bytes = $public->get($legacy);
                    $details = is_string($bytes) ? @getimagesizefromstring($bytes) : false;
                    $mime = is_array($details) ? $details['mime'] : null;
                    $extension = match ($mime) {
                        'image/jpeg' => 'jpg',
                        'image/png' => 'png',
                        'image/webp' => 'webp',
                        default => null,
                    };
                    if (! is_string($bytes) || $extension === null) {
                        $this->warn("User {$user->getKey()}: source is not a supported image; legacy reference retained.");
                        $skipped++;

                        continue;
                    }

                    $path = 'modules/avatars/'.now()->format('Y/m').'/'.Str::uuid().'.'.$extension;
                    if (! $private->put($path, $bytes) || hash('sha256', (string) $private->get($path)) !== hash('sha256', $bytes)) {
                        $private->delete($path);
                        $this->warn("User {$user->getKey()}: private copy could not be verified; legacy reference retained.");
                        $skipped++;

                        continue;
                    }

                    try {
                        $applied = DB::transaction(function () use ($user, $legacy, $path, $diskName, $mime, $extension, $bytes, $details): bool {
                            $locked = User::withTrashed()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
                            if ($locked->avatar_media_asset_id !== null || $locked->avatar_path !== $legacy) {
                                return false;
                            }
                            $asset = MediaAsset::query()->create([
                                'uploader_id' => $locked->getKey(),
                                'module' => 'avatars',
                                'disk' => $diskName,
                                'path' => $path,
                                'thumbnail_path' => null,
                                'original_name' => basename($legacy),
                                'mime_type' => $mime,
                                'extension' => $extension,
                                'size_bytes' => strlen($bytes),
                                'width' => $details[0],
                                'height' => $details[1],
                                'source' => 'migration',
                                'created_by' => $locked->getKey(),
                                'updated_by' => $locked->getKey(),
                            ]);
                            $locked->forceFill(['avatar_media_asset_id' => $asset->getKey(), 'avatar_path' => null])->saveQuietly();

                            return true;
                        });
                        if ($applied) {
                            $migrated++;
                        } else {
                            $private->delete($path);
                        }
                    } catch (Throwable $exception) {
                        $private->delete($path);
                        $this->warn("User {$user->getKey()}: database update failed; legacy reference retained.");
                        $skipped++;
                    }
                }
            });

        $this->info("Migrated {$migrated} avatar(s); skipped {$skipped}. Legacy public files were not deleted.");

        return $skipped === 0 ? self::SUCCESS : self::FAILURE;
    }
}
