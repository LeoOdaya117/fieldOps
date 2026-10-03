<?php

namespace Tests\Feature\Exports;

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
            } elseif ($format === 'pdf') {
                $this->assertStringStartsWith('%PDF-', $bytes);
                $this->assertSame(1, preg_match('/\/MediaBox\s*\[\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*\]/', $bytes, $pageBox));
                $this->assertEqualsWithDelta(595.28, (float) $pageBox[1], 1.0);
                $this->assertEqualsWithDelta(841.89, (float) $pageBox[2], 1.0);
            } else {
                $this->assertStringContainsString('A4 portrait', $bytes);
                $this->assertStringContainsString('FieldOps', $bytes);
                $this->assertStringContainsString('Export Target One', $bytes);
                $this->assertStringContainsString("window.addEventListener('load'", $bytes);
                $this->assertStringContainsString('window.print()', $bytes);
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
            } elseif ($format === 'pdf') {
                $this->assertStringStartsWith('%PDF-', $contents);
                $this->assertGreaterThan(500, strlen($contents));
            } else {
                $this->assertStringContainsString('No records match the selected filters.', $contents);
                $this->assertStringContainsString('FieldOps · Confidential system report', $contents);
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
