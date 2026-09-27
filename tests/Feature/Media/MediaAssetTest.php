<?php

namespace Tests\Feature\Media;

use App\Enums\RoleName;
use App\Models\MediaAsset;
use App\Models\PlatformImageAssignment;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
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
            ->assertJsonPath('canCreate', true)
            ->assertJsonPath('canViewDeleted', false)
            ->assertJsonPath('data.0.id', $upload->json('data.id'));

        $this->actingAs($user)->deleteJson(route('media-assets.destroy', $asset))->assertNoContent();
        Storage::disk('local')->assertExists($asset->path);
        Storage::disk('local')->assertExists($asset->thumbnail_path);
        $this->assertDatabaseHas('media_assets', ['id' => $asset->id, 'record_status' => 0]);

        $this->getJson(route('media-assets.index', ['record_status' => 'inactive']))
            ->assertOk()
            ->assertJsonPath('recordStatusFilter', 'active')
            ->assertJsonCount(0, 'data');
        $this->get(route('media-assets.content', $asset))->assertNotFound();
        $this->patchJson(route('media-assets.record-status', $asset), ['record_status' => 1])->assertForbidden();
    }

    public function test_owner_can_rename_owned_asset_without_changing_its_stored_paths(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $asset = $this->asset($owner);
        Storage::disk('local')->put($asset->path, 'image');
        Storage::disk('local')->put($asset->thumbnail_path, 'thumb');

        $this->actingAs($owner)->patchJson(route('media-assets.update', $asset), ['name' => 'renamed.png'])
            ->assertOk()
            ->assertJsonPath('data.name', 'renamed.png');

        $asset->refresh();
        $this->assertSame('renamed.png', $asset->original_name);
        Storage::disk('local')->assertExists($asset->path);
        Storage::disk('local')->assertExists($asset->thumbnail_path);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'media.asset.renamed']);
    }

    public function test_deleted_asset_can_be_listed_and_restored_only_by_an_authorized_owner(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Admin->value);
        $asset = $this->asset($owner);
        Storage::disk('local')->put($asset->path, 'image');
        Storage::disk('local')->put($asset->thumbnail_path, 'thumb');

        $this->actingAs($owner)->deleteJson(route('media-assets.destroy', $asset))->assertNoContent();
        $this->getJson(route('media-assets.index', ['record_status' => 'inactive']))
            ->assertOk()
            ->assertJsonPath('canViewDeleted', true)
            ->assertJsonPath('data.0.recordStatus', 0)
            ->assertJsonPath('data.0.recordStatusUrl', route('media-assets.record-status', $asset, false));
        $this->get(route('media-assets.content', $asset))->assertOk();

        $this->patch(route('media-assets.record-status', $asset), ['record_status' => 1])
            ->assertRedirect()
            ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('media_assets', ['id' => $asset->id, 'record_status' => 1]);

        $other = User::factory()->create();
        $other->syncRoles(RoleName::SuperAdmin->value);
        $asset->delete();
        $this->actingAs($other)->patch(route('media-assets.record-status', $asset), ['record_status' => 1])->assertForbidden();
    }

    public function test_default_user_role_has_no_deleted_asset_permissions(): void
    {
        User::factory()->create();
        $userRole = Role::query()->where('name', RoleName::User->value)->firstOrFail();

        $this->assertFalse($userRole->permissions()->whereIn('name', [
            'media_assets.view_deleted',
            'media_assets.update_deleted',
        ])->exists());
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

        $user->givePermissionTo(Permission::findOrCreate('media_assets.update_deleted', 'web'));
        $this->actingAs($user)->patchJson(route('media-assets.record-status', $asset), ['record_status' => 0])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['record_status']);
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
