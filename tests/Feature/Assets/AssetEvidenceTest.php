<?php

namespace Tests\Feature\Assets;

use App\Models\AccessAuditEvent;
use App\Models\Asset;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AssetEvidenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_asset_viewers_can_view_evidence_without_file_permissions_or_uploader_ownership(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $viewer = $this->userWith('assets.view');
        $asset = $this->asset('PUMP-01');

        $this->actingAs($manager)->post(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('manual.pdf', 2, 'application/pdf'),
        ])->assertRedirect(route('assets.show', $asset));

        $media = MediaAsset::query()->sole();
        Storage::disk('local')->assertExists($media->path);
        $this->assertSame('asset_evidence', $media->module);
        $this->assertSame($asset->id, $media->asset_id);

        $this->actingAs($viewer)->get(route('assets.show', $asset))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('evidence.data', 1, fn (Assert $row) => $row
                    ->where('name', 'manual.pdf')
                    ->where('mimeType', 'application/pdf')
                    ->where('id', $media->id)
                    ->has('contentUrl')
                    ->has('downloadUrl')
                    ->has('removeUrl')
                    ->etc())
                ->has('history.data', 1, fn (Assert $row) => $row
                    ->where('event', 'asset.evidence.attached')
                    ->where('actorName', $manager->name)
                    ->etc())
                ->missing('evidence.data.0.path')
                ->missing('evidence.data.0.disk')
                ->etc());

        $this->get(route('assets.evidence.content', [$asset->id, $media->token]))->assertOk();
        $this->actingAs($viewer)->get(route('assets.evidence.download', [$asset->id, $media->token]))->assertOk();
        $this->get(route('files.content', $media->token))->assertForbidden();
    }

    public function test_evidence_routes_require_asset_permissions_and_scope_tokens_to_the_attached_record(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $viewer = $this->userWith('assets.view');
        $filesOnly = $this->userWith('files.view', 'files.update');
        $first = $this->asset('PUMP-01');
        $second = $this->asset('PUMP-02');

        $this->actingAs($manager)->post(route('assets.evidence.store', $first), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertRedirect();
        $evidence = MediaAsset::query()->sole();
        $wrongModule = MediaAsset::query()->create([
            'asset_id' => $first->id,
            'uploader_id' => $manager->id,
            'module' => 'files',
            'disk' => 'local',
            'path' => 'modules/files/foreign.pdf',
            'original_name' => 'foreign.pdf',
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
            'size_bytes' => 1,
            'source' => 'upload',
        ]);

        $this->actingAs($viewer)->post(route('assets.evidence.store', $first), [
            'file' => UploadedFile::fake()->create('other.pdf', 1, 'application/pdf'),
        ])->assertForbidden();
        $this->delete(route('assets.evidence.destroy', [$first->id, $evidence->id]))->assertForbidden();
        $this->actingAs($filesOnly)->get(route('assets.evidence.content', [$first->id, $evidence->token]))->assertForbidden();
        $filesOnly->givePermissionTo(Permission::findOrCreate('files.update_deleted', 'web'));
        $this->actingAs($filesOnly)->patch(route('files.record-status', $evidence), ['record_status' => 0])->assertForbidden();
        $this->actingAs($manager)->get(route('assets.evidence.content', [$second->id, $evidence->token]))->assertNotFound();
        $this->delete(route('assets.evidence.destroy', [$second->id, $evidence->id]))->assertNotFound();
        $this->get(route('assets.evidence.content', [$first->id, 'foreign-token']))->assertNotFound();
        $this->get(route('assets.evidence.content', [$first->id, $wrongModule->token]))->assertNotFound();
        $this->actingAs($manager)->delete(route('assets.evidence.destroy', [$first->id, $wrongModule->id]))->assertNotFound();
    }

    public function test_evidence_endpoints_require_authentication(): void
    {
        $asset = $this->asset('PUMP-01');
        $media = MediaAsset::query()->create([
            'asset_id' => $asset->id,
            'module' => 'asset_evidence',
            'disk' => 'local',
            'path' => 'modules/asset_evidence/manual.pdf',
            'original_name' => 'manual.pdf',
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
            'size_bytes' => 1,
            'source' => 'upload',
        ]);

        $this->get(route('assets.evidence.content', [$asset->id, $media->token]))->assertRedirect(route('login'));
        $this->get(route('assets.evidence.thumbnail', [$asset->id, $media->token]))->assertRedirect(route('login'));
        $this->get(route('assets.evidence.preview-data', [$asset->id, $media->token]))->assertRedirect(route('login'));
        $this->get(route('assets.evidence.download', [$asset->id, $media->token]))->assertRedirect(route('login'));
        $this->post(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertRedirect(route('login'));
        $this->delete(route('assets.evidence.destroy', [$asset->id, $media->id]))->assertRedirect(route('login'));
    }

    public function test_media_asset_cannot_be_retargeted_to_another_asset_after_creation(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $first = $this->asset('PUMP-01');
        $second = $this->asset('PUMP-02');
        $this->actingAs($manager)->post(route('assets.evidence.store', $first), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertRedirect();
        $evidence = MediaAsset::query()->sole();

        $this->expectException(\LogicException::class);
        $evidence->forceFill(['asset_id' => $second->id])->save();
    }

    public function test_upload_rejects_unsupported_oversize_and_quota_exhaustion_without_orphaned_rows_or_blobs(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $asset = $this->asset('PUMP-01');

        $this->actingAs($manager)->postJson(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('payload.svg', 2, 'image/svg+xml'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        config()->set('media-assets.max_file_size_kilobytes', 1);
        $this->postJson(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('large.pdf', 2, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        config()->set('media-assets.max_file_size_kilobytes', 102400);
        config()->set('media-assets.asset_evidence_max_files', 0);
        $this->postJson(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('media_assets', 0);
        $this->assertDatabaseMissing('access_audit_events', ['event' => 'asset.evidence.attached']);
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_removed_evidence_still_counts_against_asset_storage_quotas(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $asset = $this->asset('PUMP-01');
        config()->set('media-assets.asset_evidence_max_files', 1);

        $this->actingAs($manager)->post(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertRedirect();
        $media = MediaAsset::query()->sole();
        $this->delete(route('assets.evidence.destroy', [$asset->id, $media->id]))->assertRedirect();

        $this->postJson(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('second.pdf', 1, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('media_assets', 1);
        Storage::disk('local')->assertExists($media->path);

        config()->set('media-assets.asset_evidence_max_files', 100);
        config()->set('media-assets.asset_evidence_max_bytes', 1024);
        $this->postJson(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('second.pdf', 1, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('media_assets', 1);
        Storage::disk('local')->assertExists($media->path);
    }

    public function test_removal_is_recoverable_keeps_blob_and_records_immutable_actor_history(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $asset = $this->asset('PUMP-01');
        $this->actingAs($manager)->post(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertRedirect();
        $media = MediaAsset::query()->sole();
        $storedPath = $media->path;

        $manager->forceFill(['name' => 'Renamed Actor', 'email' => 'renamed@example.test'])->save();
        $this->delete(route('assets.evidence.destroy', [$asset->id, $media->id]))->assertRedirect();

        $this->assertDatabaseHas('media_assets', ['id' => $media->id, 'record_status' => 0]);
        Storage::disk('local')->assertExists($storedPath);
        $this->get(route('assets.evidence.content', [$asset->id, $media->token]))->assertNotFound();

        $this->get(route('assets.show', $asset))->assertInertia(fn (Assert $page) => $page
            ->has('evidence.data', 0)
            ->has('history.data', 2)
            ->where('history.data.0.event', 'asset.evidence.removed')
            ->where('history.data.0.actorName', 'Renamed Actor')
            ->where('history.data.1.actorName', 'Manager')
            ->etc());
    }

    public function test_image_evidence_is_normalized_and_has_private_content_and_thumbnail_routes(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $asset = $this->asset('PUMP-01');

        $this->actingAs($manager)->post(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->image('inspection.png', 320, 240),
        ])->assertRedirect();
        $media = MediaAsset::query()->sole();
        Storage::disk('local')->assertExists($media->path);
        Storage::disk('local')->assertExists($media->thumbnail_path);
        $this->get(route('assets.evidence.content', [$asset->id, $media->token]))->assertOk();
        $this->get(route('assets.evidence.thumbnail', [$asset->id, $media->token]))->assertOk();
    }

    public function test_image_evidence_rejects_dimension_and_pixel_limits_without_orphaned_files(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $asset = $this->asset('PUMP-01');
        $image = UploadedFile::fake()->image('large.png', 320, 240);

        config()->set('media-assets.max_dimension_pixels', 200);
        $this->actingAs($manager)->postJson(route('assets.evidence.store', $asset), ['file' => $image])
            ->assertUnprocessable()->assertJsonValidationErrors('file');

        config()->set('media-assets.max_dimension_pixels', 8192);
        config()->set('media-assets.max_image_pixels', 50000);
        $this->postJson(route('assets.evidence.store', $asset), ['file' => $image])
            ->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('media_assets', 0);
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_asset_scoped_csv_preview_returns_bounded_rows(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $asset = $this->asset('PUMP-01');

        $this->actingAs($manager)->post(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->createWithContent('checks.csv', "item,result\npump,checked\n"),
        ])->assertRedirect();
        $media = MediaAsset::query()->sole();

        $this->actingAs($manager)->get(route('assets.show', $asset))
            ->assertInertia(fn (Assert $page) => $page
                ->where('evidence.data.0.previewDataUrl', route('assets.evidence.preview-data', [$asset->id, $media->token]))
                ->etc());

        $this->get(route('assets.evidence.preview-data', [$asset->id, $media->token]))
            ->assertOk()
            ->assertJsonPath('rows.1.0', 'pump')
            ->assertJsonPath('rows.1.1', 'checked');
    }

    public function test_history_includes_asset_create_update_and_record_status_events(): void
    {
        $manager = $this->userWith('assets.view', 'assets.view_deleted', 'assets.create', 'assets.update', 'assets.update_deleted');
        $this->actingAs($manager)->post(route('assets.store'), [
            'code' => 'PUMP-01', 'name' => 'Pump', 'category' => 'Equipment', 'condition' => 'operational',
        ])->assertRedirect();
        $asset = Asset::query()->sole();
        $this->patch(route('assets.update', $asset), [
            'code' => 'PUMP-01', 'name' => 'Updated Pump', 'category' => 'Equipment', 'condition' => 'needs_maintenance',
        ])->assertRedirect();
        $this->patch(route('assets.record-status', $asset), ['record_status' => 0])->assertRedirect();

        $this->get(route('assets.show', $asset))->assertInertia(fn (Assert $page) => $page
            ->has('history.data', 3)
            ->where('history.data.0.event', 'asset.deactivated')
            ->where('history.data.1.event', 'asset.updated')
            ->where('history.data.2.event', 'asset.created')
            ->where('history.data.1.changes.before.condition', 'operational')
            ->where('history.data.1.changes.after.condition', 'needs_maintenance')
            ->where('history.data.0.actorName', $manager->name)
            ->etc());
    }

    public function test_inactive_asset_evidence_requires_view_deleted_and_has_no_backfilled_history(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update', 'assets.update_deleted');
        $reader = $this->userWith('assets.view');
        $asset = $this->asset('PUMP-01');
        $this->actingAs($manager)->post(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertRedirect();
        $media = MediaAsset::query()->sole();
        $this->patch(route('assets.record-status', $asset), ['record_status' => 0])->assertRedirect();

        $this->actingAs($reader)->get(route('assets.evidence.content', [$asset->id, $media->token]))->assertNotFound();
        $this->actingAs($reader)->get(route('assets.show', $asset))->assertNotFound();

        $reader->givePermissionTo(Permission::findOrCreate('assets.view_deleted', 'web'));
        $this->actingAs($reader)->get(route('assets.show', $asset))->assertInertia(fn (Assert $page) => $page
            ->has('evidence.data', 1)
            ->has('history.data', 2)
            ->where('history.data.0.event', 'asset.deactivated')
            ->where('history.data.1.event', 'asset.evidence.attached')
            ->etc());
        $this->get(route('assets.evidence.content', [$asset->id, $media->token]))->assertOk();
        $this->actingAs($manager)->post(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('other.pdf', 1, 'application/pdf'),
        ])->assertNotFound();
    }

    public function test_storage_quota_failure_rolls_back_media_row_and_uploaded_blob(): void
    {
        Storage::fake('local');
        $manager = $this->userWith('assets.view', 'assets.update');
        $asset = $this->asset('PUMP-01');
        config()->set('media-assets.asset_evidence_max_bytes', 0);

        $this->actingAs($manager)->postJson(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('media_assets', 0);
        $this->assertDatabaseMissing('access_audit_events', ['event' => 'asset.evidence.attached']);
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_storage_write_failure_does_not_create_media_row(): void
    {
        $manager = $this->userWith('assets.view', 'assets.update');
        $asset = $this->asset('PUMP-01');
        $disk = \Mockery::mock(FilesystemAdapter::class);
        $disk->shouldReceive('putFileAs')->once()->andReturn(false);
        $disk->shouldReceive('delete')->atLeast()->once()->andReturn(true);
        Storage::shouldReceive('disk')->with('local')->andReturn($disk);

        $this->actingAs($manager)->postJson(route('assets.evidence.store', $asset), [
            'file' => UploadedFile::fake()->create('manual.pdf', 1, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('media_assets', 0);
    }

    public function test_evidence_and_history_pages_are_bounded_and_use_independent_page_parameters(): void
    {
        $viewer = $this->userWith('assets.view');
        $asset = $this->asset('PUMP-01');

        foreach (range(1, 11) as $index) {
            MediaAsset::query()->create([
                'asset_id' => $asset->id,
                'uploader_id' => $viewer->id,
                'module' => 'asset_evidence',
                'disk' => 'local',
                'path' => "modules/asset_evidence/{$index}.pdf",
                'original_name' => "evidence-{$index}.pdf",
                'mime_type' => 'application/pdf',
                'extension' => 'pdf',
                'size_bytes' => 100,
                'source' => 'upload',
                'created_by' => $viewer->id,
                'updated_by' => $viewer->id,
            ]);
        }
        foreach (range(1, 21) as $index) {
            AccessAuditEvent::query()->create([
                'actor_user_id' => $viewer->id,
                'event' => 'asset.updated',
                'subject_type' => $asset->getMorphClass(),
                'subject_id' => (string) $asset->id,
                'before' => ['condition' => 'operational'],
                'after' => ['condition' => 'needs_maintenance'],
                'occurred_at' => now()->addSeconds($index),
            ]);
        }

        $url = route('assets.show', $asset).'?evidence_page=2&history_page=2';
        $this->actingAs($viewer)->get($url)
            ->assertInertia(fn (Assert $page) => $page
                ->where('evidence.current_page', 2)
                ->where('evidence.per_page', 10)
                ->has('evidence.data', 1)
                ->where('history.current_page', 2)
                ->where('history.per_page', 20)
                ->has('history.data', 1)
                ->etc());
    }

    private function asset(string $code): Asset
    {
        return Asset::query()->create([
            'code' => $code,
            'name' => 'Asset '.$code,
            'category' => 'Equipment',
            'condition' => 'operational',
        ]);
    }

    private function userWith(string ...$permissions): User
    {
        $user = User::factory()->create(['name' => 'Manager']);
        foreach ($permissions as $permission) {
            $user->givePermissionTo(Permission::findOrCreate($permission, 'web'));
        }

        return $user;
    }
}
