<?php

namespace App\Actions\Settings;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\MediaAsset;
use App\Models\PlatformImageAssignment;
use App\Models\User;
use App\Support\PlatformBranding;
use App\Support\PlatformImageRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignPlatformImage
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function assign(string $slot, MediaAsset $asset, User $actor): void
    {
        $this->guard($slot, $actor);

        if ((int) $asset->uploader_id !== (int) $actor->getKey()) {
            throw ValidationException::withMessages([
                'asset_id' => 'Choose an image from your own media library.',
            ]);
        }

        DB::transaction(function () use ($slot, $asset, $actor): void {
            $assignment = PlatformImageAssignment::query()->lockForUpdate()->find($slot)
                ?? new PlatformImageAssignment(['slot' => $slot, 'version' => 0]);
            $before = $assignment->exists
                ? ['media_asset_id' => $assignment->media_asset_id, 'version' => $assignment->version]
                : null;

            $assignment->media_asset_id = $asset->getKey();
            $assignment->version = (int) $assignment->version + 1;
            $assignment->created_by ??= $actor->getKey();
            $assignment->updated_by = $actor->getKey();
            $assignment->save();

            $this->audit->record(
                event: 'settings.platform_image.assigned',
                actor: $actor,
                subject: $assignment,
                before: $before,
                after: ['slot' => $slot, 'media_asset_id' => $asset->getKey(), 'version' => $assignment->version],
            );

            PlatformBranding::forgetCache();
        });
    }

    public function reset(string $slot, User $actor): void
    {
        $this->guard($slot, $actor);

        DB::transaction(function () use ($slot, $actor): void {
            $assignment = PlatformImageAssignment::query()->lockForUpdate()->find($slot)
                ?? new PlatformImageAssignment(['slot' => $slot, 'version' => 0]);
            $before = $assignment->exists
                ? ['media_asset_id' => $assignment->media_asset_id, 'version' => $assignment->version]
                : null;

            $assignment->media_asset_id = null;
            $assignment->version = (int) $assignment->version + 1;
            $assignment->created_by ??= $actor->getKey();
            $assignment->updated_by = $actor->getKey();
            $assignment->save();

            $this->audit->record(
                event: 'settings.platform_image.reset',
                actor: $actor,
                subject: $assignment,
                before: $before,
                after: ['slot' => $slot, 'media_asset_id' => null, 'version' => $assignment->version],
            );

            PlatformBranding::forgetCache();
        });
    }

    private function guard(string $slot, User $actor): void
    {
        abort_unless(PlatformImageRegistry::has($slot), 404);
        abort_unless($actor->isActive() && $actor->email_verified_at !== null && $actor->isOwner(), 403);
    }
}
