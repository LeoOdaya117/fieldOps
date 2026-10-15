<?php

namespace Tests\Feature\Media;

use App\Actions\Media\StoreMediaAsset;
use App\Enums\RoleName;
use App\Models\MediaAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xls;
use Tests\TestCase;
use ZipArchive;

class FileManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_uploaded_csv_has_a_private_token_preview_and_audited_download(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->createWithContent('report.csv', "name,value\nalpha,42\n"),
            'module' => 'files',
            'tag' => 'report',
        ])->assertCreated()->assertJsonPath('data.module', 'files');

        $token = $response->json('data.token');
        $asset = MediaAsset::query()->sole();
        $this->assertSame($token, $asset->token);
        $this->assertStringStartsWith('modules/files/', $asset->path);
        $this->assertArrayNotHasKey('path', $response->json('data'));
        $this->assertArrayNotHasKey('id', $response->json('data'));
        Storage::disk('local')->assertExists($asset->path);

        $this->getJson(route('files.preview-data', $token))->assertOk()->assertJsonPath('rows.1.0', 'alpha');
        $this->get(route('files.download', $token))->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Cache-Control', 'no-store, private');
        $this->assertDatabaseHas('access_audit_events', ['event' => 'media.asset.downloaded']);
        $this->get(route('files.download', $asset->getKey()))->assertNotFound();
    }

    public function test_private_token_requires_authentication_and_ownership_for_ordinary_users(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $asset = $this->actingAs($owner)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->createWithContent('report.csv', "name\nalpha\n"),
        ])->assertCreated()->json('data.token');

        auth()->logout();
        $this->get(route('files.download', $asset))->assertRedirect();
        $this->actingAs($other)->get(route('files.download', $asset))->assertForbidden();
        $this->get(route('files.show', $asset))->assertForbidden();
    }

    public function test_admin_can_view_another_uploaders_file_but_not_an_invalid_token(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $token = $this->actingAs($owner)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->createWithContent('report.csv', "name\nalpha\n"),
        ])->assertCreated()->json('data.token');

        $this->actingAs($admin)->get(route('files.show', $token))->assertOk();
        $this->get(route('files.download', 'unknown-token'))->assertNotFound();
    }

    public function test_files_index_uses_the_shared_page_size_options(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('files.index', ['per_page' => 25]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('files/index')
                ->where('filters.per_page', 25)
                ->where('files.per_page', 25));
        $this->get(route('files.index', ['per_page' => 10]))
            ->assertSessionHasErrors('per_page');
    }

    public function test_admin_files_list_and_detail_agree_for_cross_uploader_gallery_assets(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $token = $this->actingAs($owner)->postJson(route('media-assets.store'), [
            'file' => UploadedFile::fake()->image('field.png', 64, 64),
            'source' => 'upload',
        ])->assertCreated()->json('data.token');

        $this->actingAs($admin)->get(route('files.index', ['module' => 'gallery']))
            ->assertOk()->assertSee($token);
        $this->get(route('files.show', $token))->assertOk();
        $this->get(route('files.content', $token))->assertOk();
        $this->getJson(route('media-assets.index'))->assertJsonCount(0, 'data');
    }

    public function test_avatar_reference_is_reported_as_assigned_in_the_gallery(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $token = $this->actingAs($owner)->postJson(route('media-assets.store'), [
            'file' => UploadedFile::fake()->image('avatar.png', 64, 64),
            'source' => 'upload',
        ])->assertCreated()->json('data.token');
        $owner->forceFill(['avatar_media_asset_id' => MediaAsset::query()->sole()->getKey()])->save();

        $this->getJson(route('media-assets.index'))->assertOk()->assertJsonPath('data.0.assigned', true);
        $this->deleteJson(route('media-assets.destroy', $token))->assertUnprocessable();
    }

    public function test_owner_can_open_an_unassigned_avatar_listed_in_files(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create();
        $asset = app(StoreMediaAsset::class)->execute(
            UploadedFile::fake()->image('old-avatar.png', 64, 64),
            'upload',
            $owner,
            'avatars',
        );

        $this->actingAs($owner)->get(route('files.index', ['module' => 'avatars']))
            ->assertOk()->assertSee($asset->token);
        $this->get(route('files.show', $asset->token))->assertOk();
    }

    public function test_file_upload_rejects_unsupported_mime_and_does_not_leave_bytes(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $this->actingAs($user)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->create('script.svg', 2, 'image/svg+xml'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('media_assets', 0);
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_image_upload_has_dimensions_thumbnail_and_inline_token_content(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $token = $this->actingAs($user)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->image('field.png', 640, 480),
        ])->assertCreated()->assertJsonPath('data.width', 640)->assertJsonPath('data.height', 480)->json('data.token');

        $asset = MediaAsset::query()->sole();
        Storage::disk('local')->assertExists($asset->thumbnail_path);
        $this->get(route('files.content', $token))->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->get(route('files.thumbnail', $token))->assertOk()->assertHeader('Content-Type', 'image/webp');
    }

    public function test_image_pixel_budget_is_checked_before_decoding_and_storage(): void
    {
        Storage::fake('local');
        config()->set('media-assets.max_image_pixels', 1000);
        $user = User::factory()->create();

        $this->actingAs($user)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->image('large.png', 40, 40),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('media_assets', 0);
        $this->assertEmpty(Storage::disk('local')->allFiles());
    }

    public function test_files_quota_counts_inactive_uploads_and_cleans_up_rejected_bytes(): void
    {
        Storage::fake('local');
        config()->set('media-assets.per_user_files_max_assets', 1);
        $user = User::factory()->create();
        $this->actingAs($user)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->createWithContent('first.csv', "name\nfirst\n"),
        ])->assertCreated();
        $storedPaths = Storage::disk('local')->allFiles();

        $this->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->createWithContent('second.csv', "name\nsecond\n"),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('media_assets', 1);
        $this->assertSame($storedPaths, Storage::disk('local')->allFiles());
    }

    public function test_csv_preview_is_bounded_by_rows_columns_and_cell_length(): void
    {
        Storage::fake('local');
        config()->set('media-assets.preview_max_rows', 2);
        config()->set('media-assets.preview_max_columns', 2);
        $user = User::factory()->create();
        $token = $this->actingAs($user)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->createWithContent('report.csv', "a,b,c\n=1+1,long,third\nextra,row,hidden\n"),
        ])->assertCreated()->json('data.token');

        $this->getJson(route('files.preview-data', $token))->assertOk()
            ->assertJsonCount(2, 'rows')
            ->assertJsonCount(2, 'rows.1')
            ->assertJsonPath('rows.1.0', '=1+1');
    }

    public function test_csv_preview_rejects_a_file_above_the_configured_byte_limit(): void
    {
        Storage::fake('local');
        config()->set('media-assets.preview_max_bytes', 16);
        $user = User::factory()->create();
        $token = $this->actingAs($user)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->createWithContent('report.csv', "name,value\nalpha,42\n"),
        ])->assertCreated()->json('data.token');

        $this->getJson(route('files.preview-data', $token))->assertUnprocessable()
            ->assertJsonPath('message', 'This file is too large to preview.');
    }

    public function test_table_preview_requests_are_throttled_per_user(): void
    {
        Storage::fake('local');
        config()->set('media-assets.previews_per_minute', 1);
        $user = User::factory()->create();
        $token = $this->actingAs($user)->postJson(route('files.store'), [
            'file' => UploadedFile::fake()->createWithContent('report.csv', "name\nalpha\n"),
        ])->assertCreated()->json('data.token');

        $this->getJson(route('files.preview-data', $token))->assertOk();
        $this->getJson(route('files.preview-data', $token))->assertTooManyRequests();
    }

    public function test_xlsx_preview_reads_values_without_evaluating_formulas(): void
    {
        Storage::fake('local');
        if (DB::getDriverName() === 'mysql') {
            $this->assertSame('varchar(255)', strtolower(Schema::getColumnType('media_assets', 'mime_type', true)));
        }
        $path = tempnam(sys_get_temp_dir(), 'fieldops-xlsx-test-');
        $this->assertIsString($path);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path, ZipArchive::OVERWRITE) === true);
        $zip->addFromString('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>');
        $zip->addFromString('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>');
        $zip->addFromString('xl/sharedStrings.xml', '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>name</t></si><si><t>alpha</t></si></sst>');
        $zip->addFromString('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row><c t="s"><v>0</v></c><c><f>2+2</f><v>4</v></c></row><row><c t="s"><v>1</v></c></row></sheetData></worksheet>');
        $zip->close();

        try {
            $user = User::factory()->create();
            $token = $this->actingAs($user)->postJson(route('files.store'), [
                'file' => UploadedFile::fake()->createWithContent('book.xlsx', file_get_contents($path)),
            ])->assertCreated()->json('data.token');

            $this->assertSame('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', MediaAsset::query()->sole()->mime_type);

            $this->getJson(route('files.preview-data', $token))->assertOk()
                ->assertJsonPath('rows.0.0', 'name')
                ->assertJsonPath('rows.0.1', '4')
                ->assertJsonPath('rows.1.0', 'alpha');
        } finally {
            unlink($path);
        }
    }

    public function test_xlsx_preview_stops_after_bounded_rows_and_needed_shared_strings(): void
    {
        Storage::fake('local');
        $path = tempnam(sys_get_temp_dir(), 'fieldops-xlsx-large-test-');
        $this->assertIsString($path);
        $zip = new ZipArchive;
        $this->assertTrue($zip->open($path, ZipArchive::OVERWRITE) === true);
        $zip->addFromString('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>');
        $zip->addFromString('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Sheet1" sheetId="1"/></sheets></workbook>');
        $zip->addFromString('xl/sharedStrings.xml', '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>first</t></si>'.str_repeat('<si><t>unused</t></si>', 5000).'</sst>');
        $zip->addFromString('xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row><c t="s"><v>0</v></c></row>'.str_repeat('<row><c><v>2</v></c></row>', 2000).'</sheetData></worksheet>');
        $zip->close();

        try {
            $user = User::factory()->create();
            $token = $this->actingAs($user)->postJson(route('files.store'), [
                'file' => UploadedFile::fake()->createWithContent('large-book.xlsx', file_get_contents($path)),
            ])->assertCreated()->json('data.token');

            $this->getJson(route('files.preview-data', $token))->assertOk()
                ->assertJsonCount(50, 'rows')
                ->assertJsonPath('rows.0.0', 'first')
                ->assertJsonPath('rows.1.0', '2');
        } finally {
            unlink($path);
        }
    }

    public function test_xls_preview_reads_first_rows_without_evaluating_formulas(): void
    {
        Storage::fake('local');
        config()->set('media-assets.preview_max_rows', 2);
        config()->set('media-assets.preview_max_columns', 2);
        $workbook = new Spreadsheet;
        $sheet = $workbook->getActiveSheet();
        $sheet->setCellValue('A1', 'name');
        $sheet->setCellValue('B1', '=2+2');
        $sheet->setCellValue('A2', 'alpha');
        $sheet->setCellValue('A3', 'hidden');
        for ($index = 0; $index < 12; $index++) {
            $workbook->createSheet()->setCellValue('A1', 'other-sheet-'.$index);
        }
        $path = tempnam(sys_get_temp_dir(), 'fieldops-xls-test-');
        $this->assertIsString($path);

        try {
            (new Xls($workbook))->save($path);
            $user = User::factory()->create();
            $token = $this->actingAs($user)->postJson(route('files.store'), [
                'file' => UploadedFile::fake()->createWithContent('book.xls', file_get_contents($path)),
            ])->assertCreated()->json('data.token');

            $this->getJson(route('files.preview-data', $token))->assertOk()
                ->assertJsonCount(2, 'rows')
                ->assertJsonPath('rows.0.0', 'name')
                ->assertJsonPath('rows.0.1', '=2+2')
                ->assertJsonPath('rows.1.0', 'alpha');
        } finally {
            $workbook->disconnectWorksheets();
            unlink($path);
        }
    }
}
