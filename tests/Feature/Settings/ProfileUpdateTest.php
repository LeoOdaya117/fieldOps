<?php

namespace Tests\Feature\Settings;

use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertSessionHas('inertia.flash_data', [
                'toast' => [
                    'type' => 'success',
                    'message' => 'Profile updated.',
                ],
            ])
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_profile_details_and_photo_can_be_updated(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                'position' => 'Field supervisor',
                'department' => 'Operations',
                'photo' => UploadedFile::fake()->image('profile.png'),
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Field supervisor', $user->position);
        $this->assertSame('Operations', $user->department);
        $this->assertNotNull($user->avatar_media_asset_id);
        $asset = MediaAsset::query()->findOrFail($user->avatar_media_asset_id);
        $this->assertSame('avatars', $asset->module);
        Storage::disk('local')->assertExists($asset->path);
        $this->assertStringContainsString($asset->token, $user->avatar);
    }

    public function test_profile_photo_can_be_removed(): void
    {
        Storage::fake('public');
        $user = User::factory()->create(['avatar_path' => 'users/1/profile.png']);
        Storage::disk('public')->put($user->avatar_path, 'profile');

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                'position' => $user->position,
                'department' => $user->department,
                'remove_photo' => '1',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNull($user->refresh()->avatar_path);
        Storage::disk('public')->assertExists('users/1/profile.png');
    }

    public function test_profile_photo_can_use_an_owned_media_asset(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $user = User::factory()->create(['avatar_path' => 'users/1/old.png']);
        $asset = $this->mediaAsset($user, 'media-assets/1/avatar.jpg');
        Storage::disk('local')->put($asset->path, 'profile-image');
        Storage::disk('public')->put($user->avatar_path, 'old-profile-image');

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                'position' => $user->position,
                'department' => $user->department,
                'avatar_media_asset_token' => $asset->token,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame($asset->id, $user->avatar_media_asset_id);
        $this->assertNull($user->avatar_path);
        $this->assertStringContainsString($asset->token, $user->avatar);
        Storage::disk('public')->assertExists('users/1/old.png');
    }

    public function test_profile_photo_cannot_use_another_users_media_asset(): void
    {
        Storage::fake('local');
        Storage::fake('public');
        $user = User::factory()->create();
        $other = User::factory()->create();
        $asset = $this->mediaAsset($other, 'media-assets/2/avatar.jpg');
        Storage::disk('local')->put($asset->path, 'profile-image');

        $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => $user->name,
                'email' => $user->email,
                'position' => $user->position,
                'department' => $user->department,
                'avatar_media_asset_token' => $asset->token,
            ])
            ->assertSessionHasErrors('avatar_media_asset_token');

        $this->assertNull($user->refresh()->avatar_path);
    }

    private function mediaAsset(User $user, string $path): MediaAsset
    {
        return MediaAsset::query()->create([
            'uploader_id' => $user->id,
            'disk' => 'local',
            'path' => $path,
            'thumbnail_path' => str_replace('.jpg', '-thumb.webp', $path),
            'original_name' => 'avatar.jpg',
            'mime_type' => 'image/jpeg',
            'extension' => 'jpg',
            'size_bytes' => 13,
            'width' => 100,
            'height' => 100,
            'source' => 'upload',
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);
    }
}
