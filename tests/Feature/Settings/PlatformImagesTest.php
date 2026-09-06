<?php

namespace Tests\Feature\Settings;

use App\Enums\RoleName;
use App\Models\MediaAsset;
use App\Models\PlatformImageAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlatformImagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_assign_serve_and_reset_a_platform_image(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::Owner->value);
        $asset = $this->asset($owner);
        Storage::disk('local')->put($asset->path, 'normalized-image');
        $session = ['auth.password_confirmed_at' => now()->timestamp];

        $this->actingAs($owner)->withSession($session)
            ->put(route('system-settings.platform-images.update', 'brand_mark'), ['asset_id' => $asset->id])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('system-settings.platform-images.index'));

        $assignment = PlatformImageAssignment::query()->findOrFail('brand_mark');
        $this->assertSame($asset->id, $assignment->media_asset_id);
        $this->get(route('platform-assets.show', ['slot' => 'brand_mark', 'v' => $assignment->version]))
            ->assertOk()
            ->assertHeader('Cache-Control', 'immutable, max-age=31536000, public');

        $this->actingAs($owner)->withSession($session)
            ->delete(route('system-settings.platform-images.destroy', 'brand_mark'))
            ->assertSessionHasNoErrors();

        $assignment->refresh();
        $this->assertNull($assignment->media_asset_id);
        $this->assertSame(2, $assignment->version);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'settings.platform_image.assigned']);
        $this->assertDatabaseHas('access_audit_events', ['event' => 'settings.platform_image.reset']);
    }

    public function test_administrators_can_view_branding_but_cannot_assign_or_reset_slots(): void
    {
        $this->withoutVite();
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Administrator->value);
        $asset = $this->asset($admin);
        $session = ['auth.password_confirmed_at' => now()->timestamp];

        $this->actingAs($admin)->get(route('system-settings.platform-images.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('settings/system/platform-images')
                ->where('canAssign', false)
                ->has('slots', 5));

        $this->actingAs($admin)->withSession($session)
            ->put(route('system-settings.platform-images.update', 'brand_mark'), ['asset_id' => $asset->id])
            ->assertForbidden();
        $this->actingAs($admin)->withSession($session)
            ->delete(route('system-settings.platform-images.destroy', 'brand_mark'))
            ->assertForbidden();
    }

    public function test_owner_cannot_assign_another_users_asset_or_an_unknown_slot(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles(RoleName::SuperAdmin->value);
        $other = User::factory()->create();
        $asset = $this->asset($other);
        $session = ['auth.password_confirmed_at' => now()->timestamp];

        $this->actingAs($owner)->withSession($session)
            ->put(route('system-settings.platform-images.update', 'brand_mark'), ['asset_id' => $asset->id])
            ->assertSessionHasErrors(['asset_id']);
        $this->actingAs($owner)->withSession($session)
            ->delete(route('system-settings.platform-images.destroy', 'unknown'))
            ->assertNotFound();
    }

    private function asset(User $user): MediaAsset
    {
        return MediaAsset::query()->create([
            'uploader_id' => $user->id,
            'disk' => 'local',
            'path' => "media-assets/{$user->id}/brand.jpg",
            'thumbnail_path' => "media-assets/{$user->id}/brand-thumb.webp",
            'original_name' => 'brand.jpg',
            'mime_type' => 'image/jpeg',
            'extension' => 'jpg',
            'size_bytes' => 16,
            'width' => 400,
            'height' => 100,
            'source' => 'upload',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
    }
}
