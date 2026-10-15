<?php

namespace Tests\Feature\Media;

use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarBackfillTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_avatar_is_copied_verified_and_tokenized_once_without_deleting_its_source(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $user = User::factory()->create();
        $path = UploadedFile::fake()->image('legacy.png', 40, 40)->store("users/{$user->id}", 'public');
        $user->forceFill(['avatar_path' => $path])->save();

        $this->artisan('files:backfill-avatars')->assertSuccessful();
        $user->refresh();
        $this->assertNull($user->avatar_path);
        $this->assertNotNull($user->avatar_media_asset_id);
        $asset = MediaAsset::query()->findOrFail($user->avatar_media_asset_id);
        $this->assertSame('avatars', $asset->module);
        $this->assertStringContainsString($asset->token, $user->avatar);
        Storage::disk('local')->assertExists($asset->path);
        Storage::disk('public')->assertExists($path);
        $this->assertSame(Storage::disk('public')->get($path), Storage::disk('local')->get($asset->path));

        $this->artisan('files:backfill-avatars')->assertSuccessful();
        $this->assertDatabaseCount('media_assets', 1);
    }

    public function test_missing_legacy_avatar_is_reported_without_losing_its_reference(): void
    {
        Storage::fake('public');
        Storage::fake('local');
        $user = User::factory()->create(['avatar_path' => 'users/missing.png']);

        $this->artisan('files:backfill-avatars')->assertFailed();
        $this->assertSame('users/missing.png', $user->fresh()->avatar_path);
        $this->assertDatabaseCount('media_assets', 0);
    }
}
