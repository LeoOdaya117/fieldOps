<?php

namespace Tests\Feature\Media;

use App\Models\MediaAsset;
use App\Models\PlatformImageAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaAssetTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_verified_user_can_upload_list_and_delete_a_normalized_owned_image(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $upload = $this->actingAs($user)->postJson(route('media-assets.store'), [
            'file' => UploadedFile::fake()->image('field photo.jpg', 800, 600),
            'source' => 'upload',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'field photo.jpg')
            ->assertJsonPath('data.width', 800)
            ->assertJsonPath('data.height', 600);

        $asset = MediaAsset::query()->sole();
        Storage::disk('local')->assertExists($asset->path);
        Storage::disk('local')->assertExists($asset->thumbnail_path);

        $this->actingAs($user)->getJson(route('media-assets.index'))
            ->assertOk()
            ->assertJsonPath('data.0.id', $upload->json('data.id'));

        $this->actingAs($user)->deleteJson(route('media-assets.destroy', $asset))->assertNoContent();
        Storage::disk('local')->assertMissing($asset->path);
        Storage::disk('local')->assertMissing($asset->thumbnail_path);
        $this->assertDatabaseHas('media_assets', ['id' => $asset->id, 'record_status' => 0]);
    }

    public function test_media_is_private_to_its_owner(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $asset = $this->asset($owner);
        Storage::disk('local')->put($asset->path, 'image');
        Storage::disk('local')->put($asset->thumbnail_path, 'thumb');

        $this->actingAs($other)->get(route('media-assets.content', $asset))->assertForbidden();
        $this->actingAs($other)->get(route('media-assets.thumbnail', $asset))->assertForbidden();
        $this->actingAs($other)->deleteJson(route('media-assets.destroy', $asset))->assertForbidden();
        $this->actingAs($other)->getJson(route('media-assets.index'))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_upload_validation_and_per_user_quota_fail_safely(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $this->actingAs($user)->postJson(route('media-assets.store'), [
            'file' => UploadedFile::fake()->create('payload.svg', 2, 'image/svg+xml'),
            'source' => 'upload',
        ])->assertUnprocessable()->assertJsonValidationErrors(['file']);

        config()->set('media-assets.per_user_max_assets', 0);
        $this->actingAs($user)->postJson(route('media-assets.store'), [
            'file' => UploadedFile::fake()->image('valid.png', 20, 20),
            'source' => 'camera',
        ])->assertUnprocessable()->assertJsonValidationErrors(['file']);

        $this->assertDatabaseCount('media_assets', 0);
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_an_assigned_asset_cannot_be_deleted(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $asset = $this->asset($user);
        PlatformImageAssignment::query()->create([
            'slot' => 'brand_mark',
            'media_asset_id' => $asset->id,
            'version' => 1,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $this->actingAs($user)->deleteJson(route('media-assets.destroy', $asset))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['asset']);

        $this->assertDatabaseHas('media_assets', ['id' => $asset->id]);
    }

    private function asset(User $user): MediaAsset
    {
        return MediaAsset::query()->create([
            'uploader_id' => $user->id,
            'disk' => 'local',
            'path' => "media-assets/{$user->id}/asset.jpg",
            'thumbnail_path' => "media-assets/{$user->id}/asset-thumb.webp",
            'original_name' => 'asset.jpg',
            'mime_type' => 'image/jpeg',
            'extension' => 'jpg',
            'size_bytes' => 5,
            'width' => 100,
            'height' => 100,
            'source' => 'upload',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
    }
}
