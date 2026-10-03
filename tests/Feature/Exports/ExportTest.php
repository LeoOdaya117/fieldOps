<?php

namespace Tests\Feature\Exports;

use App\Actions\Exports\ExportDatasetRegistry;
use App\Actions\Exports\ExportReportWriter;
use App\Actions\Exports\GenerateExportArtifact;
use App\Enums\PermissionKey;
use App\Enums\RegistrationStatus;
use App\Jobs\GenerateExportArtifactJob;
use App\Models\AccessAuditEvent;
use App\Models\BlockedIpAddress;
use App\Models\Country;
use App\Models\ExportArtifact;
use App\Models\MediaAsset;
use App\Models\Role;
use App\Models\Timezone;
use App\Models\User;
use App\Models\UserInvitation;
use App\Models\UserRegistration;
use App\Models\VisitLog;
use App\Notifications\ExportNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use Tests\TestCase;

class ExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_print_and_pdf_snapshot_selected_country_columns_in_table_order_with_actor_names(): void
    {
        Storage::fake('local');
        $writer = new CapturingExportReportWriter;
        $this->app->instance(ExportReportWriter::class, $writer);
        $actor = $this->actorWith(['countries.view', 'countries.export_pdf', 'countries.export_print']);
        Country::query()->create(['code' => 'ZX', 'name' => 'Example Country', 'created_by' => $actor->getKey(), 'updated_by' => $actor->getKey()]);
        $selected = ['updated_by', 'name', 'created_by', 'code'];

        foreach (['pdf', 'print'] as $format) {
            $this->actingAs($actor)->post($this->storeUrl('countries', $format), ['columns' => $selected])
                ->assertSessionHas('exportResult.status', 'ready');
            $artifact = ExportArtifact::query()->where('format', $format)->firstOrFail();
            $this->assertSame($selected, $artifact->filters['_report_columns']);
            $this->assertStringStartsWith('%PDF-', Storage::disk('local')->get($artifact->path));
            $this->assertSame(1, preg_match('/\/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/', Storage::disk('local')->get($artifact->path), $pageBox));
            $this->assertEqualsWithDelta(595.28, (float) $pageBox[1], 1.0);
            $this->assertEqualsWithDelta(841.89, (float) $pageBox[2], 1.0);
        }

        $registry = app(ExportDatasetRegistry::class);
        $this->assertSame(
            ['serial' => '#', 'updated_by' => 'Updated by', 'name' => 'Name', 'created_by' => 'Created by', 'code' => 'Country code'],
            $registry->reportColumns('countries', $selected),
        );
        $row = $registry->rows('countries', $actor, [])[0];
        $this->assertSame($actor->name, $row['created_by']);
        $this->assertSame($actor->name, $row['updated_by']);
        $this->assertSame(1, $row['serial']);
        $this->assertCount(2, $writer->writes);
        foreach ($writer->writes as $write) {
            $this->assertSame($registry->reportColumns('countries', $selected), $write['columns']);
            $this->assertSame($actor->name, $write['rows'][0]['created_by']);
            $this->assertSame($actor->name, $write['rows'][0]['updated_by']);
        }
    }

    public function test_wide_pdf_and_print_reports_remain_a4_portrait(): void
    {
        Storage::fake('local');
        $owner = $this->actorWith(['roles.view', 'roles.export_pdf', 'roles.export_print']);
        $registry = app(ExportDatasetRegistry::class);
        $columns = $registry->reportColumns('roles', array_keys($registry->reportColumnMap('roles')));
        $row = array_fill_keys(array_keys($columns), 'Example readable value');

        foreach (['pdf', 'print'] as $format) {
            $artifact = $this->artifact($owner, $format, []);
            app(ExportReportWriter::class)->write($artifact, 'Roles', $columns, [$row]);

            $bytes = Storage::disk('local')->get($artifact->fresh()->path);
            $this->assertSame(1, preg_match('/\/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/', $bytes, $pageBox));
            $this->assertEqualsWithDelta(595.28, (float) $pageBox[1], 1.0);
            $this->assertEqualsWithDelta(841.89, (float) $pageBox[2], 1.0);
        }
    }

    public function test_report_column_validation_rejects_empty_duplicate_unknown_and_utility_keys_without_artifact(): void
    {
        $actor = $this->actorWith(['countries.view', 'countries.export_pdf']);
        foreach ([[], ['name', 'name'], ['name', 'password'], ['serial'], ['actions'], ['selection']] as $columns) {
            $this->actingAs($actor)->post($this->storeUrl('countries', 'pdf'), ['columns' => $columns])
                ->assertSessionHasErrors();
        }
        $this->assertDatabaseCount('export_artifacts', 0);
    }

    public function test_print_and_pdf_dates_use_the_browser_timezone_and_number_filtered_rows(): void
    {
        Storage::fake('local');
        $writer = new CapturingExportReportWriter;
        $this->app->instance(ExportReportWriter::class, $writer);
        $actor = $this->actorWith(['countries.view', 'countries.export_pdf', 'countries.export_print']);
        foreach (['AF' => 'Afghanistan', 'AX' => 'Aland Islands'] as $code => $name) {
            $country = Country::query()->create(['code' => $code, 'name' => $name]);
            DB::table('countries')->where('id', $country->getKey())->update(['created_at' => '2026-09-26 12:11:00', 'updated_at' => '2026-09-26 12:11:00']);
        }

        foreach (['pdf', 'print'] as $format) {
            $this->actingAs($actor)->post($this->storeUrl('countries', $format), [
                'filters' => ['sort' => 'name', 'direction' => 'asc'],
                'columns' => ['code', 'name', 'created_at', 'updated_at'],
                'timezone' => 'Asia/Manila', 'locale' => 'en-US',
            ])->assertSessionHas('exportResult.status', 'ready');
        }

        $this->assertCount(2, $writer->writes);
        foreach ($writer->writes as $write) {
            $this->assertSame(['serial' => '#', 'code' => 'Country code', 'name' => 'Name', 'created_at' => 'Created', 'updated_at' => 'Updated'], $write['columns']);
            $this->assertSame([1, 2], array_column($write['rows'], 'serial'));
            $this->assertSame(['Afghanistan', 'Aland Islands'], array_column($write['rows'], 'name'));
            $this->assertSame('Sep 26, 2026, 8:11 PM', $write['rows'][0]['created_at']);
            $this->assertSame($write['rows'][0]['created_at'], $write['rows'][0]['updated_at']);
        }
    }

    public function test_report_timezone_and_locale_are_validated_and_spreadsheet_exports_reject_them(): void
    {
        $actor = $this->actorWith(['countries.view', 'countries.export_pdf', 'countries.export_print', 'countries.export_csv', 'countries.export_xlsx']);
        foreach ([
            ['timezone' => 'Mars/Olympus', 'locale' => 'en-US'],
            ['timezone' => 'UTC', 'locale' => str_repeat('a', 36)],
            ['timezone' => 'UTC', 'locale' => 'en-US<script>'],
        ] as $invalid) {
            $this->actingAs($actor)->post($this->storeUrl('countries', 'pdf'), $invalid)->assertSessionHasErrors();
        }
        foreach (['csv', 'xlsx'] as $format) {
            $this->actingAs($actor)->post($this->storeUrl('countries', $format), ['timezone' => 'Asia/Manila'])->assertSessionHasErrors('timezone');
        }
        $this->assertDatabaseCount('export_artifacts', 0);
    }

    public function test_report_default_locale_patterns_match_browser_date_cells_and_legacy_nulls_remain_null(): void
    {
        $actor = $this->actorWith(['users.view', 'ip_blocks.view']);
        $role = Role::query()->create(['name' => 'date_reader', 'guard_name' => 'web', 'display_name' => 'Date Reader', 'is_system' => false]);
        $invitation = $this->invitation($actor, $role, 'localized-invitation@example.test', now());
        DB::table('user_invitations')->where('id', $invitation->getKey())->update(['expires_at' => '2026-09-26 12:11:00']);
        $block = BlockedIpAddress::query()->create([
            'ip_address' => '203.0.113.70', 'reason' => 'Localized date', 'is_active' => true,
            'blocked_at' => now(), 'first_seen_at' => now(),
        ]);
        DB::table('blocked_ip_addresses')->where('id', $block->getKey())->update(['first_seen_at' => '2026-09-26 12:11:00', 'last_seen_at' => null]);
        $registry = app(ExportDatasetRegistry::class);

        $de = ['_report_timezone' => 'UTC', '_report_locale' => 'de-DE'];
        $this->assertSame('26.9.2026', $registry->rows('invitations', $actor, $de)[0]['expires_at']);
        $this->assertSame('26.9.2026, 12:11:00', $registry->rows('ip-blocks', $actor, $de)[0]['last_seen_at']);
        $ph = ['_report_timezone' => 'UTC', '_report_locale' => 'en-PH'];
        $this->assertSame('9/26/2026, 12:11:00 PM', $registry->rows('ip-blocks', $actor, $ph)[0]['last_seen_at']);
        $this->assertNull($registry->rows('ip-blocks', $actor, [])[0]['last_seen_at']);
    }

    public function test_print_and_pdf_include_serial_even_when_column_selection_is_omitted(): void
    {
        Storage::fake('local');
        $writer = new CapturingExportReportWriter;
        $this->app->instance(ExportReportWriter::class, $writer);
        $actor = $this->actorWith(['countries.view', 'countries.export_pdf', 'countries.export_print']);
        Country::query()->create(['code' => 'ZX', 'name' => 'Unselected Country']);

        foreach (['pdf', 'print'] as $format) {
            $this->actingAs($actor)->post($this->storeUrl('countries', $format))->assertSessionHas('exportResult.status', 'ready');
        }
        foreach ($writer->writes as $write) {
            $this->assertSame('#', $write['columns']['serial']);
            $this->assertSame(1, $write['rows'][0]['serial']);
        }
    }

    public function test_queued_report_keeps_selected_columns_and_csv_xlsx_keep_legacy_columns(): void
    {
        Storage::fake('local');
        $writer = new CapturingExportReportWriter;
        $this->app->instance(ExportReportWriter::class, $writer);
        $actor = $this->actorWith(['users.view', 'users.export_print', 'users.export_csv', 'users.export_xlsx']);
        $this->insertRawUsers(501, 'selected-column-queue');
        Queue::fake();
        $this->actingAs($actor)->post($this->storeUrl('users', 'print'), [
            'filters' => ['search' => 'selected-column-queue-'],
            'columns' => ['role', 'user'],
            'timezone' => 'Asia/Manila', 'locale' => 'en-US',
        ])->assertSessionHas('exportResult.status', 'queued');
        $queued = ExportArtifact::query()->where('format', 'print')->firstOrFail();
        $this->assertSame(['role', 'user'], $queued->filters['_report_columns']);
        $this->assertSame('Asia/Manila', $queued->filters['_report_timezone']);
        $this->assertSame('en-US', $queued->filters['_report_locale']);
        $this->assertArrayHasKey('_source_timezone', $queued->filters);
        Queue::assertPushed(GenerateExportArtifactJob::class);
        DB::table('users')->where('email', 'like', 'selected-column-queue-%')
            ->where('email', '!=', 'selected-column-queue-0@example.test')->delete();
        (new GenerateExportArtifactJob((string) $queued->getKey()))->handle(app(GenerateExportArtifact::class));
        $this->assertSame('ready', $queued->fresh()->status);
        $this->assertSame(['serial' => '#', 'role' => 'Role', 'user' => 'User'], $writer->writes[0]['columns']);
        $this->assertCount(1, $writer->writes[0]['rows']);
        $this->assertSame(1, $writer->writes[0]['rows'][0]['serial']);
        $this->assertStringStartsWith('%PDF-', Storage::disk('local')->get($queued->fresh()->path));

        $this->actingAs($actor)->post($this->storeUrl('users', 'csv'), [
            'filters' => ['search' => 'no matching selected-column row'],
        ])->assertSessionHas('exportResult.status', 'ready');
        $csv = ExportArtifact::query()->where('format', 'csv')->firstOrFail();
        $this->assertArrayNotHasKey('_report_columns', $csv->filters);
        $this->assertStringContainsString('"Name","Email"', Storage::disk('local')->get($csv->path));

        $this->actingAs($actor)->post($this->storeUrl('users', 'xlsx'), [
            'filters' => ['search' => 'no matching selected-column row'],
        ])->assertSessionHas('exportResult.status', 'ready');
        $xlsx = ExportArtifact::query()->where('format', 'xlsx')->firstOrFail();
        $sheet = IOFactory::load(Storage::disk('local')->path($xlsx->path));
        $this->assertSame('Name', $sheet->getActiveSheet()->getCell('B4')->getValue());
        $sheet->disconnectWorksheets();
    }

    public function test_queued_report_interprets_dates_in_snapshotted_source_timezone_and_restores_worker_timezone(): void
    {
        Storage::fake('local');
        $writer = new CapturingExportReportWriter;
        $this->app->instance(ExportReportWriter::class, $writer);
        $owner = $this->actorWith(['users.view', 'users.export_pdf']);
        $target = User::factory()->create(['email' => 'source-zone@example.test']);
        DB::table('users')->where('id', $target->getKey())->update(['created_at' => '2026-09-26 00:11:00']);
        $artifact = $this->artifact($owner, 'pdf', [
            'search' => 'source-zone@example.test', '_report_columns' => ['created'],
            '_source_timezone' => 'Asia/Manila', '_report_timezone' => 'UTC', '_report_locale' => 'en-US',
        ]);
        $originalConfig = config('app.timezone');
        $originalDefault = date_default_timezone_get();
        try {
            config()->set('app.timezone', 'UTC');
            date_default_timezone_set('UTC');
            app(GenerateExportArtifact::class)->execute((string) $artifact->getKey());

            $this->assertSame('ready', $artifact->fresh()->status);
            $this->assertSame('Sep 25, 2026, 4:11 PM', $writer->writes[0]['rows'][0]['created_at']);
            $this->assertSame('UTC', config('app.timezone'));
            $this->assertSame('UTC', date_default_timezone_get());
        } finally {
            config()->set('app.timezone', $originalConfig);
            date_default_timezone_set($originalDefault);
        }
    }

    public function test_report_column_aliases_cover_all_datasets_without_exposing_raw_audit_values(): void
    {
        $registry = app(ExportDatasetRegistry::class);
        $selections = [
            'users' => ['user', 'created'], 'invitations' => ['expires'], 'registrations' => ['applicant'],
            'roles' => ['role', 'assigned', 'permissions'], 'audit' => ['subject', 'occurred', 'changes'],
            'ip-blocks' => ['status'], 'visit-logs' => ['location', 'event', 'request', 'status', 'user_agent'],
            'files' => ['name', 'type', 'size', 'dimensions'], 'countries' => ['code', 'created_by'],
            'timezones' => ['name', 'updated_by'],
        ];
        foreach ($selections as $dataset => $selected) {
            $this->assertCount(count($selected) + (in_array($dataset, ['users', 'invitations', 'roles', 'audit', 'ip-blocks', 'visit-logs', 'countries', 'timezones'], true) ? 1 : 0), $registry->reportColumns($dataset, $selected));
            $this->assertArrayNotHasKey('actions', $registry->reportColumnMap($dataset));
            $this->assertArrayNotHasKey('serial', $registry->reportColumnMap($dataset));
        }

        $actor = $this->actorWith(['audit.view', 'audit.export_pdf']);
        AccessAuditEvent::query()->create([
            'actor_user_id' => $actor->getKey(), 'event' => 'test.changed', 'subject_type' => 'Country', 'subject_id' => '1',
            'before' => ['password' => 'secret-before'], 'after' => ['password' => 'secret-after'], 'occurred_at' => now(),
        ]);
        $row = $registry->rows('audit', $actor, [])[0];
        $this->assertSame('password', $row['changes']);
        $this->assertStringNotContainsString('secret-before', (string) $row['changes']);
        $this->assertStringNotContainsString('secret-after', (string) $row['changes']);

        Role::query()->create([
            'name' => 'report_operator', 'guard_name' => 'web', 'display_name' => 'Report Operator',
            'description' => 'Reviews reports', 'is_system' => false,
        ]);
        $roleRow = collect($registry->rows('roles', $actor, []))->firstWhere('name', 'report_operator');
        $this->assertSame('Report Operator (report_operator) - Reviews reports', $roleRow['role_summary']);

        $protectedRole = Role::query()->create([
            'name' => 'protected_report_role', 'guard_name' => 'web', 'display_name' => 'Protected Report Role',
            'is_system' => true,
        ]);
        $protectedRow = collect($registry->rows('roles', $actor, []))->firstWhere('name', $protectedRole->name);
        $this->assertSame('Protected', $protectedRow['type_display']);
        $this->assertSame('Managed', $protectedRow['permissions_display']);
        $this->assertSame(['serial' => '#', 'type_display' => 'Type', 'permissions_display' => 'Permissions'], $registry->reportColumns('roles', ['type', 'permissions']));
        $this->assertSame('System', $protectedRow['type']);
        $this->assertSame(0, $protectedRow['permissions_count']);

        $firstSeen = now()->subMinute();
        BlockedIpAddress::query()->create([
            'ip_address' => '203.0.113.68', 'reason' => 'Observed abuse', 'is_active' => true,
            'blocked_at' => now(), 'first_seen_at' => $firstSeen,
        ]);
        $ipBlockRow = $registry->rows('ip-blocks', $actor, [])[0];
        $this->assertSame('Blocked', $ipBlockRow['block_status']);
        $this->assertNull($ipBlockRow['last_seen_at']);
        $reportBlockRow = $registry->rows('ip-blocks', $actor, ['_report_timezone' => 'UTC', '_report_locale' => 'en-US'])[0];
        $this->assertNotNull($reportBlockRow['last_seen_at']);

        VisitLog::query()->create([
            'user_id' => $actor->getKey(), 'event_type' => 'login', 'outcome' => 'success',
            'ip_address' => '203.0.113.68', 'location_source' => 'browser',
            'location_city' => 'Manila', 'location_country_code' => 'PH',
            'location_latitude' => 14.5995, 'location_longitude' => 120.9842,
            'location_accuracy_meters' => 12.6, 'method' => 'POST',
            'route_name' => 'login.store', 'path' => '/login', 'occurred_at' => now(),
        ]);
        $visitRow = $registry->rows('visit-logs', $actor, [])[0];
        $this->assertSame('POST login.store /login', $visitRow['request']);
        $this->assertStringContainsString('Manila, PH; 14.59950, 120.98420; Browser location ±13 m', $visitRow['location']);
        $this->assertSame($actor->name.' ('.$actor->email.')', $visitRow['user_display']);
    }

    public function test_csv_xlsx_pdf_and_print_use_the_shared_safe_report_layout(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv', 'users.export_xlsx', 'users.export_pdf', 'users.export_print']);
        User::factory()->create(['name' => 'Export Target One', 'email' => 'target-one@example.com']);
        User::factory()->create(['name' => 'Export Target Two', 'email' => 'target-two@example.com']);
        User::factory()->create(['name' => 'Unrelated Row', 'email' => 'unrelated@example.com']);

        foreach (['csv', 'xlsx', 'pdf', 'print'] as $format) {
            $this->actingAs($user)->from('/access/users')->post($this->storeUrl('users', $format), [
                'filters' => ['search' => 'Export Target', 'page' => 2, 'per_page' => 25],
            ])->assertRedirect('/access/users')->assertSessionHas('exportResult.status', 'ready');

            $artifact = ExportArtifact::query()->where('owner_id', $user->getKey())->where('format', $format)->latest('created_at')->firstOrFail();
            $this->assertSame(2, $artifact->row_count);
            $bytes = Storage::disk('local')->get($artifact->path);
            $this->assertStringNotContainsString('unrelated@example.com', $bytes);
            $this->assertStringNotContainsString('two_factor_secret', $bytes);

            if ($format === 'csv') {
                $this->assertStringContainsString('"Name","Email"', $bytes);
                $this->assertStringContainsString('target-one@example.com', $bytes);
            } elseif ($format === 'xlsx') {
                $this->assertStringStartsWith('PK', $bytes);
                $spreadsheet = IOFactory::load(Storage::disk('local')->path($artifact->path));
                $this->assertSame(DataType::TYPE_STRING, $spreadsheet->getActiveSheet()->getCell('B5')->getDataType());
                $this->assertSame('Export Target One', $spreadsheet->getActiveSheet()->getCell('B5')->getValue());
                $this->assertSame(PageSetup::PAPERSIZE_A4, $spreadsheet->getActiveSheet()->getPageSetup()->getPaperSize());
                $this->assertSame(PageSetup::ORIENTATION_PORTRAIT, $spreadsheet->getActiveSheet()->getPageSetup()->getOrientation());
                $spreadsheet->disconnectWorksheets();
            } elseif (in_array($format, ['pdf', 'print'], true)) {
                $this->assertStringEndsWith('.pdf', $artifact->path);
                $this->assertStringStartsWith('%PDF-', $bytes);
                $this->assertSame(1, preg_match('/\/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/', $bytes, $pageBox));
                $this->assertEqualsWithDelta(595.28, (float) $pageBox[1], 1.0);
                $this->assertEqualsWithDelta(841.89, (float) $pageBox[2], 1.0);
            }
        }
    }

    public function test_csv_and_xlsx_escape_formula_values_as_text(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv', 'users.export_xlsx']);
        User::factory()->create(['name' => '=HYPERLINK("https://example.test")', 'email' => '+SUM(1,1)@example.test']);

        $this->actingAs($user)->from('/access/users')->post($this->storeUrl('users', 'csv'), ['filters' => ['search' => 'HYPERLINK']])
            ->assertSessionHas('exportResult.status', 'ready');
        $csv = ExportArtifact::query()->where('format', 'csv')->firstOrFail();
        $this->assertStringContainsString("'=HYPERLINK", Storage::disk('local')->get($csv->path));

        $this->actingAs($user)->from('/access/users')->post($this->storeUrl('users', 'xlsx'), ['filters' => ['search' => 'HYPERLINK']])
            ->assertSessionHas('exportResult.status', 'ready');
        $xlsx = ExportArtifact::query()->where('format', 'xlsx')->firstOrFail();
        $spreadsheet = IOFactory::load(Storage::disk('local')->path($xlsx->path));
        $cell = $spreadsheet->getActiveSheet()->getCell('B5');
        $this->assertSame(DataType::TYPE_STRING, $cell->getDataType());
        $this->assertSame('=HYPERLINK("https://example.test")', $cell->getValue());
        $spreadsheet->disconnectWorksheets();
    }

    public function test_export_applies_requested_sort_order(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv']);
        User::factory()->create(['name' => 'Sort Target Alpha', 'email' => 'sort-alpha@example.test']);
        User::factory()->create(['name' => 'Sort Target Zulu', 'email' => 'sort-zulu@example.test']);

        $this->actingAs($user)->post($this->storeUrl('users', 'csv'), [
            'filters' => ['search' => 'Sort Target', 'sort' => 'name', 'direction' => 'desc'],
        ])->assertSessionHas('exportResult.status', 'ready');

        $artifact = ExportArtifact::query()->firstOrFail();
        $contents = Storage::disk('local')->get($artifact->path);
        $zuluPosition = strpos($contents, 'Sort Target Zulu');
        $alphaPosition = strpos($contents, 'Sort Target Alpha');
        $this->assertIsInt($zuluPosition);
        $this->assertIsInt($alphaPosition);
        $this->assertLessThan($alphaPosition, $zuluPosition);
    }

    public function test_empty_results_render_in_all_export_formats(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv', 'users.export_xlsx', 'users.export_pdf', 'users.export_print']);

        foreach (['csv', 'xlsx', 'pdf', 'print'] as $format) {
            $this->actingAs($user)->post($this->storeUrl('users', $format), [
                'filters' => ['search' => 'no matching user exists'],
            ])->assertSessionHas('exportResult.status', 'ready');

            $artifact = ExportArtifact::query()->where('format', $format)->latest('created_at')->firstOrFail();
            $this->assertSame(0, $artifact->row_count);
            $contents = Storage::disk('local')->get($artifact->path);
            if ($format === 'csv') {
                $this->assertStringContainsString('"Name","Email"', $contents);
            } elseif ($format === 'xlsx') {
                $spreadsheet = IOFactory::load(Storage::disk('local')->path($artifact->path));
                $this->assertSame('Name', $spreadsheet->getActiveSheet()->getCell('B4')->getValue());
                $this->assertNull($spreadsheet->getActiveSheet()->getCell('B5')->getValue());
                $spreadsheet->disconnectWorksheets();
            } else {
                $this->assertStringEndsWith('.pdf', $artifact->path);
                $this->assertStringStartsWith('%PDF-', $contents);
                $this->assertGreaterThan(500, strlen($contents));
            }
        }
    }

    public function test_inactive_rows_are_only_exported_with_deleted_visibility_permission(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['countries.view', 'countries.export_csv']);
        Country::query()->create(['code' => 'AA', 'name' => 'Visible active country']);
        $inactive = Country::query()->create(['code' => 'BB', 'name' => 'Permission gated inactive country']);
        $inactive->delete();

        $this->actingAs($user)->post($this->storeUrl('countries', 'csv'), [
            'filters' => ['record_status' => 'inactive'],
        ])->assertSessionHas('exportResult.status', 'ready');
        $withoutDeletedAccess = ExportArtifact::query()->latest('created_at')->firstOrFail();
        $contents = Storage::disk('local')->get($withoutDeletedAccess->path);
        $this->assertStringContainsString('Visible active country', $contents);
        $this->assertStringNotContainsString('Permission gated inactive country', $contents);

        $user->givePermissionTo('countries.view_deleted');
        $this->actingAs($user)->post($this->storeUrl('countries', 'csv'), [
            'filters' => ['record_status' => 'inactive'],
        ])->assertSessionHas('exportResult.status', 'ready');
        $withDeletedAccess = ExportArtifact::query()->where('id', '!=', $withoutDeletedAccess->getKey())->firstOrFail();
        $contents = Storage::disk('local')->get($withDeletedAccess->path);
        $this->assertStringContainsString('Permission gated inactive country', $contents);
        $this->assertStringNotContainsString('Visible active country', $contents);
    }

    public function test_country_export_matches_listing_search_and_sort_order(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['countries.view', 'countries.export_csv']);
        Country::query()->create(['code' => 'CA', 'name' => 'Parity Target Alpha']);
        Country::query()->create(['code' => 'CZ', 'name' => 'Parity Target Zulu']);
        Country::query()->create(['code' => 'CU', 'name' => 'Unrelated country']);

        $this->actingAs($user)->get(route('system.countries.index', [
            'search' => 'Parity Target', 'sort' => 'name', 'direction' => 'desc', 'per_page' => 25,
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('countries.data.0.name', 'Parity Target Zulu')
            ->where('countries.data.1.name', 'Parity Target Alpha')
            ->has('countries.data', 2));

        $this->actingAs($user)->post($this->storeUrl('countries', 'csv'), [
            'filters' => ['search' => 'Parity Target', 'sort' => 'name', 'direction' => 'desc'],
        ])->assertSessionHas('exportResult.status', 'ready');
        $artifact = ExportArtifact::query()->firstOrFail();
        $contents = Storage::disk('local')->get($artifact->path);
        $zuluPosition = strpos($contents, 'Parity Target Zulu');
        $alphaPosition = strpos($contents, 'Parity Target Alpha');
        $this->assertIsInt($zuluPosition);
        $this->assertIsInt($alphaPosition);
        $this->assertLessThan($alphaPosition, $zuluPosition);
        $this->assertStringNotContainsString('Unrelated country', $contents);
    }

    public function test_invitation_export_matches_listing_status_filter_and_created_sort(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv']);
        $role = Role::query()->create([
            'name' => 'invitation_parity_role', 'guard_name' => 'web', 'display_name' => 'Invitation Parity Role',
            'description' => 'Invitation export parity fixture.', 'is_system' => false,
        ]);
        $this->invitation($user, $role, 'parity-alpha@example.test', now()->subMinutes(2));
        $this->invitation($user, $role, 'parity-zulu@example.test', now()->subMinute());
        $this->invitation($user, $role, 'revoked-unrelated@example.test', now(), revokedAt: now());

        $filters = ['record_status' => 'active', 'invitation_sort' => 'created_at', 'invitation_direction' => 'desc'];
        $this->actingAs($user)->get(route('access.users.index', [
            'record_status' => 'active', 'invitation_sort' => 'created_at', 'invitation_direction' => 'desc',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('invitations.0.email', 'parity-zulu@example.test')
            ->where('invitations.1.email', 'parity-alpha@example.test')
            ->has('invitations', 2));

        $this->actingAs($user)->post($this->storeUrl('invitations', 'csv'), ['filters' => $filters])
            ->assertSessionHas('exportResult.status', 'ready');
        $rows = $this->csvDataRows(ExportArtifact::query()->firstOrFail());
        $this->assertSame(['parity-zulu@example.test', 'parity-alpha@example.test'], array_column($rows, 'Email'));
        $this->assertNotContains('revoked-unrelated@example.test', array_column($rows, 'Email'));
    }

    public function test_role_export_matches_listing_type_assignment_search_and_sort(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['roles.view', 'roles.export_csv']);
        foreach ([
            ['parity_role_alpha', 'Parity Role Alpha'],
            ['parity_role_zulu', 'Parity Role Zulu'],
            ['unrelated_role', 'Unrelated Role'],
        ] as [$key, $label]) {
            Role::query()->create([
                'name' => $key, 'guard_name' => 'web', 'display_name' => $label,
                'description' => 'Export parity fixture.', 'is_system' => false,
            ]);
        }

        $this->actingAs($user)->get(route('access.roles.index', [
            'search' => 'Parity Role', 'type' => 'custom', 'assigned' => 'unassigned',
            'sort' => 'display_name', 'direction' => 'desc',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('roles.data.0.displayName', 'Parity Role Zulu')
            ->where('roles.data.1.displayName', 'Parity Role Alpha')
            ->has('roles.data', 2));

        $this->actingAs($user)->post($this->storeUrl('roles', 'csv'), ['filters' => [
            'search' => 'Parity Role', 'type' => 'custom', 'assigned' => 'unassigned',
            'sort' => 'display_name', 'direction' => 'desc',
        ]])->assertSessionHas('exportResult.status', 'ready');
        $rows = $this->csvDataRows(ExportArtifact::query()->firstOrFail());
        $this->assertSame(['Parity Role Zulu', 'Parity Role Alpha'], array_column($rows, 'Role'));
        $this->assertNotContains('Unrelated Role', array_column($rows, 'Role'));
    }

    public function test_audit_export_matches_listing_event_actor_filter_and_time_sort(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['audit.view', 'audit.export_csv']);
        $user->forceFill(['name' => 'Parity Audit Actor'])->saveQuietly();
        foreach ([
            ['old-subject', now()->subMinute()],
            ['new-subject', now()],
        ] as [$subjectId, $occurredAt]) {
            AccessAuditEvent::query()->create([
                'actor_user_id' => $user->getKey(), 'event' => 'parity.created', 'subject_type' => 'ParityFixture',
                'subject_id' => $subjectId, 'ip_address' => '192.0.2.40', 'occurred_at' => $occurredAt,
            ]);
        }
        AccessAuditEvent::query()->create([
            'actor_user_id' => $user->getKey(), 'event' => 'parity.updated', 'subject_type' => 'ParityFixture',
            'subject_id' => 'unrelated-subject', 'ip_address' => '192.0.2.41', 'occurred_at' => now()->addSecond(),
        ]);

        $this->actingAs($user)->get(route('access.audit.index', [
            'event' => 'parity.created', 'actor' => 'Parity Audit Actor', 'sort' => 'occurred_at', 'direction' => 'desc',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('events.data.0.subjectId', 'new-subject')
            ->where('events.data.1.subjectId', 'old-subject')
            ->has('events.data', 2));

        $this->actingAs($user)->post($this->storeUrl('audit', 'csv'), ['filters' => [
            'event' => 'parity.created', 'actor' => 'Parity Audit Actor', 'sort' => 'occurred_at', 'direction' => 'desc',
        ]])->assertSessionHas('exportResult.status', 'ready');
        $rows = $this->csvDataRows(ExportArtifact::query()->firstOrFail());
        $this->assertSame(['new-subject', 'old-subject'], array_column($rows, 'Subject ID'));
        $this->assertNotContains('unrelated-subject', array_column($rows, 'Subject ID'));
    }

    public function test_ip_block_export_matches_listing_search_status_filter_and_sort(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['ip_blocks.view', 'ip_blocks.export_csv']);
        BlockedIpAddress::query()->create([
            'ip_address' => '198.51.100.20', 'reason' => 'Parity IP Alpha', 'is_active' => true, 'blocked_at' => now()->subMinute(),
        ]);
        BlockedIpAddress::query()->create([
            'ip_address' => '198.51.100.30', 'reason' => 'Parity IP Zulu', 'is_active' => true, 'blocked_at' => now(),
        ]);
        BlockedIpAddress::query()->create([
            'ip_address' => '198.51.100.40', 'reason' => 'Unrelated IP rule', 'is_active' => true, 'blocked_at' => now()->addSecond(),
        ]);

        $this->actingAs($user)->get(route('access.ip-blocks.index', [
            'search' => 'Parity IP', 'status' => 'active', 'sort' => 'ip_address', 'direction' => 'desc',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('blockedIpAddresses.data.0.ipAddress', '198.51.100.30')
            ->where('blockedIpAddresses.data.1.ipAddress', '198.51.100.20')
            ->has('blockedIpAddresses.data', 2));

        $this->actingAs($user)->post($this->storeUrl('ip-blocks', 'csv'), ['filters' => [
            'search' => 'Parity IP', 'status' => 'active', 'sort' => 'ip_address', 'direction' => 'desc',
        ]])->assertSessionHas('exportResult.status', 'ready');
        $rows = $this->csvDataRows(ExportArtifact::query()->firstOrFail());
        $this->assertSame(['198.51.100.30', '198.51.100.20'], array_column($rows, 'IP Address'));
        $this->assertNotContains('198.51.100.40', array_column($rows, 'IP Address'));
    }

    public function test_visit_log_export_matches_listing_keyword_event_filter_and_time_sort(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['visit_logs.view', 'visit_logs.export_csv']);
        VisitLog::query()->create([
            'event_type' => 'login', 'outcome' => 'success', 'ip_address' => '203.0.113.20', 'location_city' => 'Parity City Alpha',
            'method' => 'POST', 'path' => '/login', 'status_code' => 302, 'occurred_at' => now()->subMinute(),
        ]);
        VisitLog::query()->create([
            'event_type' => 'login', 'outcome' => 'success', 'ip_address' => '203.0.113.30', 'location_city' => 'Parity City Zulu',
            'method' => 'POST', 'path' => '/login', 'status_code' => 302, 'occurred_at' => now(),
        ]);
        VisitLog::query()->create([
            'event_type' => 'logout', 'outcome' => 'success', 'ip_address' => '203.0.113.40', 'location_city' => 'Parity City Other Event',
            'method' => 'POST', 'path' => '/logout', 'status_code' => 302, 'occurred_at' => now()->addSecond(),
        ]);
        VisitLog::query()->create([
            'event_type' => 'login', 'outcome' => 'success', 'ip_address' => '198.51.100.50', 'location_city' => 'Unrelated City',
            'method' => 'POST', 'path' => '/login', 'status_code' => 302, 'occurred_at' => now()->addSeconds(2),
        ]);

        $this->actingAs($user)->get(route('access.visit-logs.index', [
            'keyword' => 'Parity City', 'event' => 'login', 'sort' => 'occurred_at', 'direction' => 'desc',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('logs.data.0.ipAddress', '203.0.113.30')
            ->where('logs.data.1.ipAddress', '203.0.113.20')
            ->has('logs.data', 2));

        $this->actingAs($user)->post($this->storeUrl('visit-logs', 'csv'), ['filters' => [
            'keyword' => 'Parity City', 'event' => 'login', 'sort' => 'occurred_at', 'direction' => 'desc',
        ]])->assertSessionHas('exportResult.status', 'ready');
        $rows = $this->csvDataRows(ExportArtifact::query()->firstOrFail());
        $this->assertSame(['203.0.113.30', '203.0.113.20'], array_column($rows, 'IP Address'));
        $this->assertSame(['login', 'login'], array_column($rows, 'Event'));
        $this->assertNotContains('203.0.113.40', array_column($rows, 'IP Address'));
        $this->assertNotContains('198.51.100.50', array_column($rows, 'IP Address'));
    }

    public function test_timezone_export_matches_listing_search_and_sort_order(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['timezones.view', 'timezones.export_csv']);
        Timezone::query()->create(['name' => 'Parity Target America/Alpha']);
        Timezone::query()->create(['name' => 'Parity Target America/Zulu']);
        Timezone::query()->create(['name' => 'Unrelated timezone']);

        $this->actingAs($user)->get(route('system.timezones.index', [
            'search' => 'Parity Target', 'sort' => 'name', 'direction' => 'desc',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('timezones.data.0.name', 'Parity Target America/Zulu')
            ->where('timezones.data.1.name', 'Parity Target America/Alpha')
            ->has('timezones.data', 2));

        $this->actingAs($user)->post($this->storeUrl('timezones', 'csv'), ['filters' => [
            'search' => 'Parity Target', 'sort' => 'name', 'direction' => 'desc',
        ]])->assertSessionHas('exportResult.status', 'ready');
        $rows = $this->csvDataRows(ExportArtifact::query()->firstOrFail());
        $this->assertSame(['Parity Target America/Zulu', 'Parity Target America/Alpha'], array_column($rows, 'Timezone'));
        $this->assertNotContains('Unrelated timezone', array_column($rows, 'Timezone'));
    }

    public function test_default_rbac_and_forward_migration_grant_export_permissions_to_admin_roles(): void
    {
        $permissionNames = PermissionKey::exportValuesFor([
            'users', 'roles', 'audit', 'ip_blocks', 'visit_logs', 'files', 'media_assets', 'countries', 'timezones',
        ]);
        $adminDefaults = config('rbac.roles.admin.permissions');
        $superAdminDefaults = config('rbac.roles.super_admin.permissions');
        $this->assertSame([], array_values(array_diff($permissionNames, $adminDefaults)));
        $this->assertSame(PermissionKey::values(), $superAdminDefaults);

        $admin = Role::query()->create(['name' => 'admin', 'guard_name' => 'web', 'display_name' => 'Admin', 'is_system' => true, 'record_status' => 1]);
        $superAdmin = Role::query()->create(['name' => 'super_admin', 'guard_name' => 'web', 'display_name' => 'Super Admin', 'is_system' => true, 'record_status' => 1]);
        $permissionIds = DB::table('permissions')->whereIn('name', $permissionNames)->where('guard_name', 'web')->pluck('id');
        DB::table('role_has_permissions')->whereIn('role_id', [$admin->getKey(), $superAdmin->getKey()])->whereIn('permission_id', $permissionIds)->delete();

        Schema::dropIfExists('export_artifacts');
        $migration = require database_path('migrations/2026_09_30_000001_add_export_permissions_and_artifacts.php');
        $migration->up();

        foreach ([$admin, $superAdmin] as $role) {
            $this->assertSame(count($permissionNames), DB::table('role_has_permissions')
                ->where('role_id', $role->getKey())->whereIn('permission_id', $permissionIds)->count());
        }
    }

    public function test_export_requires_authentication_resource_view_and_format_permission(): void
    {
        $url = $this->storeUrl('users', 'csv');
        $this->post($url)->assertRedirect(route('login'));

        $viewer = $this->actorWith(['users.view']);
        $this->actingAs($viewer)->postJson($url)->assertForbidden();

        $exporterWithoutView = $this->actorWith(['users.export_csv']);
        $this->actingAs($exporterWithoutView)->postJson($url)->assertForbidden();

        $inviteOnly = $this->actorWith(['users.invite', 'users.export_csv']);
        $inviteOnly->syncRoles([]);
        $this->actingAs($inviteOnly)->postJson($this->storeUrl('invitations', 'csv'))->assertForbidden();

        $invitationViewer = $this->actorWith(['users.view', 'users.export_csv']);
        $this->actingAs($invitationViewer)->post($this->storeUrl('invitations', 'csv'))
            ->assertSessionHas('exportResult.status', 'ready');

        $filesDenied = $this->actorWith(['users.view', 'users.export_csv']);
        $filesDenied->syncRoles([]);
        $this->actingAs($filesDenied)->postJson($this->storeUrl('files', 'csv'))->assertForbidden();
    }

    public function test_export_validates_filters_and_enforces_the_exact_ten_thousand_row_boundary(): void
    {
        Storage::fake('local');
        Queue::fake();
        $user = $this->actorWith(['users.view', 'users.export_csv']);
        $this->actingAs($user)->postJson($this->storeUrl('users', 'csv'), [
            'filters' => ['search' => ['unbounded']],
        ])->assertUnprocessable()->assertJsonValidationErrors('filters.search');

        $this->insertRawUsers(10000, 'limit-boundary');
        $this->actingAs($user)->from('/access/users')->post($this->storeUrl('users', 'csv'), [
            'filters' => ['search' => 'limit-boundary-'],
        ])->assertSessionHas('exportResult.status', 'queued');
        $this->assertSame(10000, ExportArtifact::query()->firstOrFail()->row_count);

        $this->insertRawUsers(1, 'limit-boundary');
        $this->actingAs($user)->from('/access/users')->post($this->storeUrl('users', 'csv'), [
            'filters' => ['search' => 'limit-boundary-'],
        ])
            ->assertSessionHasErrors(['export' => 'This export exceeds the 10,000 row limit. Narrow the filters and try again.']);
        $this->assertDatabaseCount('export_artifacts', 1);
    }

    public function test_immediate_and_queued_generation_meet_the_exact_five_hundred_row_boundary(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv']);
        $this->insertRawUsers(500, 'sync-boundary');

        $this->actingAs($user)->post($this->storeUrl('users', 'csv'), [
            'filters' => ['search' => 'sync-boundary-'],
        ])->assertSessionHas('exportResult.status', 'ready');
        $ready = ExportArtifact::query()->firstOrFail();
        $this->assertSame(500, $ready->row_count);

        $this->insertRawUsers(1, 'sync-boundary');
        Queue::fake();
        $this->actingAs($user)->post($this->storeUrl('users', 'csv'), [
            'filters' => ['search' => 'sync-boundary-'],
        ])
            ->assertSessionHas('exportResult.status', 'queued');

        $artifact = ExportArtifact::query()->where('status', 'queued')->firstOrFail();
        $this->assertSame('queued', $artifact->status);
        $this->assertSame(501, $artifact->row_count);
        Queue::assertPushed(GenerateExportArtifactJob::class, fn ($job): bool => $job->artifactId === $artifact->getKey());
    }

    public function test_worker_rechecks_permission_and_notifies_ready_or_failed_without_exposing_artifact_data(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv']);
        User::factory()->create(['name' => 'Background Target', 'email' => 'background@example.com']);
        $artifact = $this->artifact($user, 'csv', ['search' => 'Background Target']);

        (new GenerateExportArtifactJob((string) $artifact->getKey()))->handle(app(GenerateExportArtifact::class));

        $artifact->refresh();
        $this->assertSame('ready', $artifact->status);
        $this->assertDatabaseHas('notifications', ['notifiable_id' => $user->getKey()]);
        $this->actingAs($user)->getJson(route('notifications.summary'))
            ->assertJsonPath('items.0.type', 'export.ready')
            ->assertJsonPath('items.0.actionUrl', route('exports.artifacts.download', $artifact, false))
            ->assertDontSee($artifact->path);

        $user->revokePermissionTo('users.export_csv');
        $this->actingAs($user)->getJson(route('notifications.summary'))
            ->assertJsonPath('items.0.type', 'export.ready')
            ->assertJsonPath('items.0.actionUrl', null);

        $revoked = $this->artifact($user, 'csv', []);
        app(GenerateExportArtifact::class)->execute((string) $revoked->getKey());
        $revoked->refresh();
        $this->assertSame('failed', $revoked->status);
        $this->assertSame('export.failed', $user->notifications()->latest()->firstOrFail()->data['event']);
    }

    public function test_queue_writer_failure_marks_artifact_failed_and_sends_failure_notification(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv']);
        $artifact = $this->artifact($user, 'csv', []);
        $writer = $this->mock(ExportReportWriter::class);
        $writer->shouldReceive('write')->once()->andThrow(new \RuntimeException('simulated writer failure'));

        (new GenerateExportArtifactJob((string) $artifact->getKey()))->handle(app(GenerateExportArtifact::class));

        $artifact->refresh();
        $this->assertSame('failed', $artifact->status);
        $this->assertSame('export.failed', $user->notifications()->latest()->firstOrFail()->data['event']);
    }

    public function test_downloads_are_private_and_require_current_permission_and_unexpired_artifact(): void
    {
        Storage::fake('local');
        $owner = $this->actorWith(['users.view', 'users.export_csv']);
        $other = User::factory()->create();
        $artifact = $this->artifact($owner, 'csv', [], status: 'ready', content: "Name,Email\r\nPrivate,private@example.test\r\n");

        $this->actingAs($owner)->get(route('exports.artifacts.download', $artifact))->assertDownload('users-export-'.$artifact->created_at->format('Ymd').'.csv');
        $this->actingAs($other)->get(route('exports.artifacts.download', $artifact))->assertNotFound();
        $owner->revokePermissionTo('users.export_csv');
        $this->actingAs($owner)->get(route('exports.artifacts.download', $artifact))->assertNotFound();

        $expiredOwner = $this->actorWith(['users.view', 'users.export_csv']);
        $expired = $this->artifact($expiredOwner, 'csv', [], status: 'ready', content: "Name\r\nExpired\r\n");
        $expired->forceFill(['expires_at' => now()->subSecond()])->save();
        $this->actingAs($expiredOwner)->get(route('exports.artifacts.download', $expired))->assertNotFound();
        $expiredOwner->notify(new ExportNotification('export.ready', 'Ready', 'Ready', (string) $expired->getKey()));
        $this->actingAs($expiredOwner)->getJson(route('notifications.summary'))
            ->assertJsonPath('items.0.type', 'export.ready')
            ->assertJsonPath('items.0.actionUrl', null);
    }

    public function test_pdf_download_and_print_viewer_have_distinct_dispositions_and_permissions(): void
    {
        Storage::fake('local');
        $owner = $this->actorWith(['users.view', 'users.export_pdf', 'users.export_print']);

        foreach (['pdf', 'print'] as $format) {
            $response = $this->actingAs($owner)->post($this->storeUrl('users', $format), [
                'filters' => ['search' => 'no matching user exists'],
            ])->assertSessionHas('exportResult.status', 'ready');
            $created = ExportArtifact::query()->where('format', $format)->firstOrFail();
            $response->assertSessionHas(
                $format === 'print' ? 'exportResult.printUrl' : 'exportResult.downloadUrl',
                route($format === 'print' ? 'exports.artifacts.print' : 'exports.artifacts.download', $created),
            );
        }

        $pdf = ExportArtifact::query()->where('format', 'pdf')->firstOrFail();
        $print = ExportArtifact::query()->where('format', 'print')->firstOrFail();
        $this->assertStringEndsWith('.pdf', $print->path);
        $this->assertSame('print', $print->format);
        $this->actingAs($owner)->get(route('exports.artifacts.download', $pdf))
            ->assertDownload('users-export-'.$pdf->created_at->format('Ymd').'.pdf')
            ->assertHeader('Content-Type', 'application/pdf');
        $printResponse = $this->actingAs($owner)->get(route('exports.artifacts.print', $print))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', 'inline; filename="users-export-'.$print->created_at->format('Ymd').'.pdf"')
            ->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString('private', (string) $printResponse->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', (string) $printResponse->headers->get('Cache-Control'));
        $this->assertStringStartsWith('%PDF-', $printResponse->getContent());
        $this->actingAs($owner)->get(route('exports.artifacts.download', $print))->assertNotFound();
        $this->actingAs($owner)->get(route('exports.artifacts.print', $pdf))->assertNotFound();

        $other = $this->actorWith(['users.view', 'users.export_print']);
        $this->actingAs($other)->get(route('exports.artifacts.print', $print))->assertNotFound();
        $owner->revokePermissionTo('users.export_print');
        $this->actingAs($owner)->get(route('exports.artifacts.print', $print))->assertNotFound();
        $this->actingAs($owner)->get(route('exports.artifacts.download', $pdf))->assertOk();
        $owner->givePermissionTo('users.export_print');
        $print->forceFill(['expires_at' => now()->subSecond()])->save();
        $this->actingAs($owner)->get(route('exports.artifacts.print', $print))->assertNotFound();
    }

    public function test_existing_html_print_artifact_keeps_its_restricted_response_until_expiry(): void
    {
        Storage::fake('local');
        $owner = $this->actorWith(['users.view', 'users.export_print']);
        $legacy = $this->artifact($owner, 'print', [], status: 'ready');
        $path = 'exports/'.$owner->getKey().'/'.$legacy->getKey().'.html';
        Storage::disk('local')->put($path, '<!doctype html><title>Legacy report</title>');
        $legacy->forceFill(['path' => $path])->save();

        $response = $this->actingAs($owner)->get(route('exports.artifacts.print', $legacy))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertSee('Legacy report');
        $this->assertStringContainsString("default-src 'none'", (string) $response->headers->get('Content-Security-Policy'));

        $legacy->forceFill(['expires_at' => now()->subSecond()])->save();
        $this->actingAs($owner)->get(route('exports.artifacts.print', $legacy))->assertNotFound();
    }

    public function test_queued_print_notification_opens_the_inline_pdf_route(): void
    {
        Storage::fake('local');
        $owner = $this->actorWith(['users.view', 'users.export_print']);
        $artifact = $this->artifact($owner, 'print', []);

        (new GenerateExportArtifactJob((string) $artifact->getKey()))->handle(app(GenerateExportArtifact::class));

        $artifact->refresh();
        $this->assertSame('ready', $artifact->status);
        $this->assertStringEndsWith('.pdf', $artifact->path);
        $this->actingAs($owner)->getJson(route('notifications.summary'))
            ->assertJsonPath('items.0.type', 'export.ready')
            ->assertJsonPath('items.0.actionUrl', route('exports.artifacts.print', $artifact, false));
        $this->actingAs($owner)->get(route('exports.artifacts.print', $artifact))
            ->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_shared_pdf_renderer_paginates_long_reports(): void
    {
        Storage::fake('local');
        $owner = $this->actorWith(['users.view', 'users.export_pdf', 'users.export_print']);
        $rows = [];
        for ($index = 1; $index <= 150; $index++) {
            $rows[] = ['name' => 'Long report row '.$index, 'detail' => str_repeat('Sample detail ', 12)];
        }

        foreach (['pdf', 'print'] as $format) {
            $artifact = $this->artifact($owner, $format, []);
            app(ExportReportWriter::class)->write($artifact, 'Long report', ['name' => 'Name', 'detail' => 'Detail'], $rows);
            $artifact->refresh();
            $bytes = Storage::disk('local')->get($artifact->path);
            $this->assertStringEndsWith('.pdf', $artifact->path);
            $this->assertStringStartsWith('%PDF-', $bytes);
            $this->assertGreaterThan(1, preg_match_all('/\/Type\s*\/Page\b/', $bytes));
            $this->assertSame(150, $artifact->row_count);
        }
    }

    public function test_registrations_require_review_permission_and_export_only_pending_rows(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.export_csv']);
        UserRegistration::query()->create(['name' => 'Pending Person', 'email' => 'pending@example.test', 'password' => Hash::make('registration-secret'), 'status' => RegistrationStatus::Pending]);

        $this->actingAs($user)->postJson($this->storeUrl('registrations', 'csv'))->assertForbidden();

        $user->givePermissionTo('users.review_registrations');
        $this->actingAs($user)->from('/access/users/registrations')->post($this->storeUrl('registrations', 'csv'))
            ->assertSessionHas('exportResult.status', 'ready');
        $artifact = ExportArtifact::query()->firstOrFail();
        $contents = Storage::disk('local')->get($artifact->path);
        $this->assertStringContainsString('pending@example.test', $contents);
        $this->assertStringNotContainsString('registration-secret', $contents);
    }

    public function test_files_export_includes_only_modules_with_both_view_and_format_permissions(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['files.view', 'files.export_csv']);
        $filesAsset = $this->mediaAsset($user, 'files', 'private-file.pdf');
        $this->mediaAsset($user, 'gallery', 'gallery-image.png');
        $this->mediaAsset($user, 'avatars', 'avatar-image.png');

        $this->actingAs($user)->from('/files')->post($this->storeUrl('files', 'csv'))
            ->assertSessionHas('exportResult.status', 'ready');
        $artifact = ExportArtifact::query()->firstOrFail();
        $contents = Storage::disk('local')->get($artifact->path);
        $this->assertStringContainsString('private-file.pdf', $contents);
        $this->assertStringNotContainsString('gallery-image.png', $contents);
        $this->assertStringNotContainsString('avatar-image.png', $contents);
        $this->assertStringNotContainsString($filesAsset->path, $contents);
    }

    public function test_files_export_includes_all_visible_avatars_and_owner_only_avatars(): void
    {
        Storage::fake('local');
        $globalViewer = $this->actorWith(['files.view', 'files.export_csv', 'users.view', 'users.export_csv']);
        $otherUser = User::factory()->create();
        $globalAvatar = $this->mediaAsset($otherUser, 'avatars', 'visible-other-avatar.png');

        $this->actingAs($globalViewer)->from('/files')->post($this->storeUrl('files', 'csv'))
            ->assertSessionHas('exportResult.status', 'ready');
        $globalArtifact = ExportArtifact::query()->firstOrFail();
        $this->assertStringContainsString('visible-other-avatar.png', Storage::disk('local')->get($globalArtifact->path));
        $this->assertSame(['files' => 'owner', 'avatars' => 'all'], $globalArtifact->filters['_file_scopes']);

        $ownerViewer = $this->actorWith(['files.view', 'files.export_csv', 'users.export_csv']);
        $ownAvatar = $this->mediaAsset($ownerViewer, 'avatars', 'owned-avatar.png');
        $this->mediaAsset(User::factory()->create(), 'avatars', 'not-owned-avatar.png');

        $this->actingAs($ownerViewer)->from('/files')->post($this->storeUrl('files', 'csv'))
            ->assertSessionHas('exportResult.status', 'ready');
        $ownerArtifact = ExportArtifact::query()->where('owner_id', $ownerViewer->getKey())->firstOrFail();
        $contents = Storage::disk('local')->get($ownerArtifact->path);
        $this->assertStringContainsString('owned-avatar.png', $contents);
        $this->assertStringNotContainsString('not-owned-avatar.png', $contents);
        $this->assertSame(['files' => 'owner', 'avatars' => 'owner'], $ownerArtifact->filters['_file_scopes']);
        $this->assertStringNotContainsString($ownAvatar->path, $contents);
    }

    public function test_expired_export_artifacts_are_pruned_with_their_private_files(): void
    {
        Storage::fake('local');
        $user = $this->actorWith(['users.view', 'users.export_csv']);
        $artifact = $this->artifact($user, 'csv', [], status: 'ready', content: 'expired');
        $artifact->forceFill(['expires_at' => now()->subSecond()])->save();

        $this->artisan('exports:prune')->assertSuccessful();
        $this->assertDatabaseMissing('export_artifacts', ['id' => $artifact->getKey()]);
        Storage::disk('local')->assertMissing($artifact->path);
    }

    private function actorWith(array $permissions): User
    {
        $user = User::factory()->create();
        foreach ($permissions as $permission) {
            $user->givePermissionTo($permission);
        }

        return $user;
    }

    private function storeUrl(string $dataset, string $format): string
    {
        return route('exports.store', ['dataset' => $dataset, 'format' => $format]);
    }

    private function invitation(User $inviter, Role $role, string $email, \DateTimeInterface $createdAt, ?\DateTimeInterface $revokedAt = null): UserInvitation
    {
        $invitation = UserInvitation::query()->create([
            'email' => $email,
            'role_id' => $role->getKey(),
            'invited_by' => $inviter->getKey(),
            'token_hash' => UserInvitation::hashToken($email),
            'expires_at' => now()->addDay(),
            'revoked_at' => $revokedAt,
        ]);
        $invitation->forceFill(['created_at' => $createdAt])->saveQuietly();

        return $invitation;
    }

    /** @return list<array<string, string>> */
    private function csvDataRows(ExportArtifact $artifact): array
    {
        $contents = Storage::disk($artifact->disk)->get((string) $artifact->path);
        $contents = preg_replace('/^\xEF\xBB\xBF/', '', $contents) ?? $contents;
        $lines = array_values(array_filter(
            preg_split('/\r\n|\n|\r/', trim($contents)) ?: [],
            static fn (string $line): bool => $line !== '',
        ));
        $headers = str_getcsv(array_shift($lines) ?? '');
        if ($headers === []) {
            return [];
        }
        $rows = [];
        foreach ($lines as $line) {
            $values = str_getcsv($line);
            if (count($values) === count($headers)) {
                $rows[] = array_combine($headers, $values);
            }
        }

        return $rows;
    }

    private function artifact(User $owner, string $format, array $filters, string $status = 'queued', ?string $content = null): ExportArtifact
    {
        $artifact = ExportArtifact::query()->create([
            'owner_id' => $owner->getKey(), 'dataset' => 'users', 'format' => $format, 'status' => $status,
            'filters' => $filters, 'disk' => 'local', 'expires_at' => now()->addDay(), 'row_count' => 0,
        ]);
        if ($content !== null) {
            $path = 'exports/'.$owner->getKey().'/'.$artifact->getKey().'.'.$format;
            Storage::disk('local')->put($path, $content);
            $artifact->forceFill(['path' => $path])->save();
        }

        return $artifact;
    }

    private function insertRawUsers(int $count, string $prefix): void
    {
        $offset = DB::table('users')->where('email', 'like', $prefix.'-%')->count();
        $batch = [];
        for ($index = $offset; $index < $offset + $count; $index++) {
            $user = User::factory()->make(['email' => $prefix.'-'.$index.'@example.test']);
            $batch[] = $user->getAttributes();
            if (count($batch) === 250) {
                DB::table('users')->insert($batch);
                $batch = [];
            }
        }
        if ($batch !== []) {
            DB::table('users')->insert($batch);
        }
    }

    private function mediaAsset(User $uploader, string $module, string $name): MediaAsset
    {
        return MediaAsset::query()->create([
            'uploader_id' => $uploader->getKey(), 'disk' => 'local', 'path' => 'assets/'.$module.'/'.$name,
            'thumbnail_path' => null, 'original_name' => $name, 'module' => $module, 'mime_type' => 'application/octet-stream',
            'extension' => pathinfo($name, PATHINFO_EXTENSION), 'size_bytes' => 5, 'width' => 1, 'height' => 1, 'source' => 'upload',
        ]);
    }
}

class CapturingExportReportWriter extends ExportReportWriter
{
    /** @var list<array{columns: array<string, string>, rows: list<array<string, scalar|null>>}> */
    public array $writes = [];

    /** @param array<string, string> $columns
     * @param  list<array<string, scalar|null>>  $rows
     */
    public function write(ExportArtifact $artifact, string $title, array $columns, array $rows): void
    {
        $this->writes[] = ['columns' => $columns, 'rows' => $rows];
        parent::write($artifact, $title, $columns, $rows);
    }
}
