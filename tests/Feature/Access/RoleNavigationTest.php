<?php

namespace Tests\Feature\Access;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Http\Controllers\Access\RoleController;
use App\Models\AccessAuditEvent;
use App\Models\Role;
use App\Models\User;
use App\Support\NavigationCatalog;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RoleNavigationTest extends TestCase
{
    use RefreshDatabase;

    public function test_roles_persist_navigation_items_as_a_nullable_json_list(): void
    {
        $this->assertTrue(Schema::hasColumn('roles', 'navigation_items'));
        $this->assertTrue(Schema::hasColumn('roles', 'custom_navigation_items'));
        $this->assertTrue(Schema::hasColumn('roles', 'navigation_group_overrides'));

        $role = Role::query()->create([
            'name' => 'navigation_editor',
            'guard_name' => 'web',
            'display_name' => 'Navigation editor',
            'navigation_items' => ['notifications', 'dashboard'],
            'custom_navigation_items' => [$this->customItem()],
            'navigation_group_overrides' => ['dashboard' => 'Reports'],
        ]);

        $this->assertSame(['notifications', 'dashboard'], $role->fresh()->navigation_items);
        $this->assertCustomNavigationItems([$this->customItem()], $role->fresh()->custom_navigation_items);
        $this->assertSame(['dashboard' => 'Reports'], $role->fresh()->navigation_group_overrides);

        $legacyRole = Role::query()->create([
            'name' => 'legacy_navigation',
            'guard_name' => 'web',
            'display_name' => 'Legacy navigation',
        ]);

        $this->assertNull($legacyRole->fresh()->navigation_items);
        $this->assertNull($legacyRole->fresh()->custom_navigation_items);
        $this->assertNull($legacyRole->fresh()->navigation_group_overrides);
    }

    public function test_custom_navigation_migration_adds_and_rolls_back_only_the_custom_json_column(): void
    {
        $role = Role::query()->create([
            'name' => 'migration_navigation',
            'guard_name' => 'web',
            'display_name' => 'Migration navigation',
            'navigation_items' => ['dashboard'],
            'custom_navigation_items' => [$this->customItem()],
        ]);
        $migration = require base_path('database/migrations/2026_10_18_000002_add_custom_navigation_items_to_roles.php');

        $migration->down();

        $this->assertFalse(Schema::hasColumn('roles', 'custom_navigation_items'));

        $migration->up();

        $this->assertTrue(Schema::hasColumn('roles', 'custom_navigation_items'));
        $this->assertSame(['dashboard'], $role->fresh()->navigation_items);
        $this->assertNull($role->fresh()->custom_navigation_items);
    }

    public function test_rbac_seeder_sets_new_defaults_and_preserves_custom_and_legacy_values_on_reseed(): void
    {
        $this->seed(RbacSeeder::class);

        $this->assertSame(['notifications', 'dashboard', 'files'], Role::findByName(RoleName::User->value)->navigation_items);
        $this->assertSame([
            'notifications', 'dashboard', 'users', 'roles', 'access_audit', 'blocked_ips',
            'visit_logs', 'files', 'countries', 'timezones', 'system_settings',
        ], Role::findByName(RoleName::Admin->value)->navigation_items);
        $this->assertSame([
            'notifications', 'dashboard', 'users', 'roles', 'access_audit', 'blocked_ips',
            'visit_logs', 'files', 'countries', 'timezones', 'system_settings', 'backups',
        ], Role::findByName(RoleName::SuperAdmin->value)->navigation_items);
        $this->assertNull(Role::findByName(RoleName::User->value)->navigation_group_overrides);

        Role::findByName(RoleName::User->value)->forceFill(['navigation_items' => ['files']])->save();
        Role::findByName(RoleName::User->value)->forceFill(['custom_navigation_items' => [$this->customItem()]])->save();
        Role::findByName(RoleName::Admin->value)->forceFill(['navigation_items' => null])->save();

        $this->seed(RbacSeeder::class);

        $this->assertSame(['files'], Role::findByName(RoleName::User->value)->fresh()->navigation_items);
        $this->assertCustomNavigationItems([$this->customItem()], Role::findByName(RoleName::User->value)->fresh()->custom_navigation_items);
        $this->assertNull(Role::findByName(RoleName::Admin->value)->fresh()->navigation_items);
    }

    public function test_role_create_and_update_save_navigation_and_audit_the_before_and_after_values(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), [
                'name' => 'field_reviewer',
                'display_name' => 'Field reviewer',
                'permissions' => ['dashboard.view', 'files.view'],
                'navigation_items' => ['notifications', 'dashboard'],
            ])
            ->assertRedirect(route('access.roles.index'));

        $role = Role::query()->where('name', 'field_reviewer')->firstOrFail();
        $this->assertSame(['notifications', 'dashboard'], $role->navigation_items);
        $created = AccessAuditEvent::query()->where('event', 'role.created')->firstOrFail();
        $this->assertSame(['notifications', 'dashboard'], $created->after['navigation_items']);

        $this->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.roles.update', $role), [
                'name' => 'field_reviewer',
                'display_name' => 'Field reviewer',
                'permissions' => ['dashboard.view', 'files.view'],
                'navigation_items' => ['files'],
            ])
            ->assertRedirect(route('access.roles.index'));

        $this->assertSame(['files'], $role->fresh()->navigation_items);
        $updated = AccessAuditEvent::query()->where('event', 'role.updated')->firstOrFail();
        $this->assertSame(['notifications', 'dashboard'], $updated->before['navigation_items']);
        $this->assertSame(['files'], $updated->after['navigation_items']);
    }

    public function test_custom_destinations_save_edit_audit_and_render_in_selected_order_without_granting_access(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $customItem = $this->customItem([
            'title' => 'Staff directory',
            'group' => 'Operations',
            'url' => '/access/users',
            'iconKey' => 'building',
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), [
                'name' => 'custom_menu_role',
                'display_name' => 'Custom menu role',
                'permissions' => ['dashboard.view'],
                'navigation_items' => [$customItem['key'], 'dashboard'],
                'custom_navigation_items' => [$customItem],
            ])
            ->assertRedirect(route('access.roles.index'));

        $role = Role::query()->where('name', 'custom_menu_role')->firstOrFail();
        $this->assertSame([$customItem['key'], 'dashboard'], $role->navigation_items);
        $this->assertCustomNavigationItems([$customItem], $role->custom_navigation_items);

        $created = AccessAuditEvent::query()->where('event', 'role.created')->firstOrFail();
        $this->assertSame([$customItem['key'], 'dashboard'], $created->after['navigation_items']);
        $this->assertCustomNavigationItems([$customItem], $created->after['custom_navigation_items']);

        $this->get(route('access.roles.edit', $role))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('role.navigationItems', [$customItem['key'], 'dashboard'])
                ->has('role.customNavigationItems', 1)
                ->where('role.customNavigationItems.0.key', $customItem['key'])
                ->where('role.customNavigationItems.0.title', $customItem['title'])
                ->where('role.customNavigationItems.0.group', $customItem['group'])
                ->where('role.customNavigationItems.0.url', $customItem['url'])
                ->where('role.customNavigationItems.0.iconKey', $customItem['iconKey'])
                ->where('customNavigationIconKeys.0', 'bell'));

        $member = User::factory()->create();
        $member->syncRoles($role);

        $this->actingAs($member)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation', [
                    [
                        'label' => 'Operations',
                        'items' => [[
                            'key' => $customItem['key'],
                            'title' => 'Staff directory',
                            'href' => '/access/users',
                            'iconKey' => 'building',
                        ]],
                    ],
                    [
                        'label' => 'Platform',
                        'items' => [[
                            'key' => 'dashboard',
                            'title' => 'Dashboard',
                            'href' => route('dashboard'),
                            'iconKey' => 'layoutGrid',
                        ]],
                    ],
                ]));

        $this->get(route('access.users.index'))->assertForbidden();

        $updatedCustomItem = $this->customItem([
            'title' => 'Staff directory',
            'group' => 'External tools',
            'url' => 'https://example.com/directory',
            'iconKey' => 'activity',
        ]);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.roles.update', $role), [
                'name' => 'custom_menu_role',
                'display_name' => 'Custom menu role',
                'permissions' => ['dashboard.view'],
                'navigation_items' => ['dashboard', $updatedCustomItem['key']],
                'custom_navigation_items' => [$updatedCustomItem],
            ])
            ->assertRedirect(route('access.roles.index'));

        $this->assertSame(['dashboard', $updatedCustomItem['key']], $role->fresh()->navigation_items);
        $this->assertCustomNavigationItems([$updatedCustomItem], $role->fresh()->custom_navigation_items);

        $member->syncRoles($role->fresh());
        $this->actingAs($member)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation.1.label', 'External tools')
                ->where('auth.navigation.1.items.0.href', 'https://example.com/directory')
                ->where('auth.navigation.1.items.0.iconKey', 'activity'));

        $updated = AccessAuditEvent::query()->where('event', 'role.updated')->firstOrFail();
        $this->assertCustomNavigationItems([$customItem], $updated->before['custom_navigation_items']);
        $this->assertCustomNavigationItems([$updatedCustomItem], $updated->after['custom_navigation_items']);
    }

    public function test_role_group_overrides_persist_audit_and_render_only_on_builtin_items(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $customItem = $this->customItem([
            'title' => 'Operations guide',
            'group' => 'Custom resources',
            'url' => '/guide',
        ]);
        $initialOverrides = ['dashboard' => 'Operations'];

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), [
                'name' => 'group_override_role',
                'display_name' => 'Group override role',
                'permissions' => ['dashboard.view'],
                'navigation_items' => ['dashboard', $customItem['key']],
                'custom_navigation_items' => [$customItem],
                'navigation_group_overrides' => $initialOverrides,
            ])
            ->assertRedirect(route('access.roles.index'));

        $role = Role::query()->where('name', 'group_override_role')->firstOrFail();
        $this->assertSame($initialOverrides, $role->navigation_group_overrides);
        $unrelatedRole = Role::query()->create([
            'name' => 'unrelated_navigation_role',
            'guard_name' => 'web',
            'display_name' => 'Unrelated navigation role',
            'navigation_items' => ['notifications'],
            'navigation_group_overrides' => ['notifications' => 'Platform'],
        ]);
        $created = AccessAuditEvent::query()->where('event', 'role.created')->firstOrFail();
        $this->assertSame($initialOverrides, $created->after['navigation_group_overrides']);

        $this->get(route('access.roles.edit', $role))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('role.navigationGroupOverrides.dashboard', 'Operations'));

        $member = User::factory()->create();
        $member->syncRoles($role);

        $this->actingAs($member)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation', [
                    [
                        'label' => 'Operations',
                        'items' => [[
                            'key' => 'dashboard',
                            'title' => 'Dashboard',
                            'href' => route('dashboard'),
                            'iconKey' => 'layoutGrid',
                        ]],
                    ],
                    [
                        'label' => 'Custom resources',
                        'items' => [[
                            'key' => $customItem['key'],
                            'title' => 'Operations guide',
                            'href' => '/guide',
                            'iconKey' => 'link',
                        ]],
                    ],
                ]));

        $updatedOverrides = ['dashboard' => 'Reports'];
        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.roles.update', $role), [
                'name' => 'group_override_role',
                'display_name' => 'Group override role',
                'permissions' => ['dashboard.view'],
                'navigation_items' => ['dashboard', $customItem['key']],
                'custom_navigation_items' => [$customItem],
                'navigation_group_overrides' => $updatedOverrides,
            ])
            ->assertRedirect(route('access.roles.index'));

        $this->assertSame($updatedOverrides, $role->fresh()->navigation_group_overrides);
        $this->assertSame(
            ['notifications' => 'Platform'],
            $unrelatedRole->fresh()->navigation_group_overrides,
        );
        $this->assertSame(['notifications'], $unrelatedRole->fresh()->navigation_items);
        $updated = AccessAuditEvent::query()->where('event', 'role.updated')->firstOrFail();
        $this->assertSame($initialOverrides, $updated->before['navigation_group_overrides']);
        $this->assertSame($updatedOverrides, $updated->after['navigation_group_overrides']);

        $member->syncRoles($role->fresh());
        $this->actingAs($member)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation.0.label', 'Reports')
                ->where('auth.navigation.1.label', 'Custom resources'));
    }

    public function test_group_override_validation_rejects_unknown_keys_and_blank_or_oversized_labels(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $auditCount = AccessAuditEvent::query()->count();
        $payload = [
            'name' => 'invalid_group_overrides',
            'display_name' => 'Invalid group overrides',
            'permissions' => [],
            'navigation_items' => [],
            'custom_navigation_items' => [],
        ];
        $invalidOverrides = [
            [['unknown_destination' => 'Operations'], 'navigation_group_overrides'],
            [['dashboard' => ''], 'navigation_group_overrides.dashboard'],
            [['dashboard' => '   '], 'navigation_group_overrides.dashboard'],
            [['dashboard' => str_repeat('x', 61)], 'navigation_group_overrides.dashboard'],
            [['Operations'], 'navigation_group_overrides'],
        ];

        foreach ($invalidOverrides as [$overrides, $error]) {
            $this->actingAs($admin)
                ->withSession(['auth.password_confirmed_at' => time()])
                ->from(route('access.roles.create'))
                ->post(route('access.roles.store'), [
                    ...$payload,
                    'navigation_group_overrides' => $overrides,
                ])
                ->assertSessionHasErrors($error);
        }

        $this->assertDatabaseMissing('roles', ['name' => 'invalid_group_overrides']);
        $this->assertDatabaseCount('access_audit_events', $auditCount);
    }

    public function test_custom_destination_validation_rejects_unsafe_urls_icons_keys_shapes_and_counts(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $auditCount = AccessAuditEvent::query()->count();
        $baseItem = $this->customItem();
        $payload = [
            'name' => 'invalid_custom_navigation',
            'display_name' => 'Invalid custom navigation',
            'permissions' => [],
            'navigation_items' => [$baseItem['key']],
            'custom_navigation_items' => [$baseItem],
        ];

        $invalidItems = [
            [['url' => 'javascript:alert(1)'], 'custom_navigation_items.0.url'],
            [['url' => 'http://example.com'], 'custom_navigation_items.0.url'],
            [['url' => '//example.com/path'], 'custom_navigation_items.0.url'],
            [['url' => 'https://user:pass@example.com/path'], 'custom_navigation_items.0.url'],
            [['url' => '/reports path'], 'custom_navigation_items.0.url'],
            [['url' => '/reports\\admin'], 'custom_navigation_items.0.url'],
            [['iconKey' => '<svg>'], 'custom_navigation_items.0.iconKey'],
            [['key' => 'custom-not-a-uuid'], 'custom_navigation_items.0.key'],
            [['extra' => 'not allowed'], 'custom_navigation_items.0'],
            [['title' => null], 'custom_navigation_items.0.title'],
        ];

        foreach ($invalidItems as [$overrides, $error]) {
            $item = array_replace($baseItem, $overrides);
            $this->actingAs($admin)
                ->withSession(['auth.password_confirmed_at' => time()])
                ->from(route('access.roles.create'))
                ->post(route('access.roles.store'), [...$payload, 'custom_navigation_items' => [$item]])
                ->assertSessionHasErrors($error);
        }

        $duplicateCustom = [$baseItem, $baseItem];
        $this->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'custom_navigation_items' => $duplicateCustom])
            ->assertSessionHasErrors('custom_navigation_items.1.key');

        $this->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'navigation_items' => ['dashboard', 'dashboard']])
            ->assertSessionHasErrors('navigation_items.1');

        $this->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'navigation_items' => ['custom_123e4567-e89b-12d3-a456-426614174001']])
            ->assertSessionHasErrors('navigation_items.0');

        $this->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'custom_navigation_items' => array_fill(0, 21, $baseItem)])
            ->assertSessionHasErrors('custom_navigation_items');

        $tooManySelected = array_fill(0, 33, 'dashboard');
        $this->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'navigation_items' => $tooManySelected])
            ->assertSessionHasErrors('navigation_items');

        $this->assertDatabaseMissing('roles', ['name' => 'invalid_custom_navigation']);
        $this->assertDatabaseCount('access_audit_events', $auditCount);
    }

    public function test_invalid_custom_url_patch_leaves_role_navigation_permissions_and_audit_unchanged(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $customItem = $this->customItem([
            'title' => 'Reports',
            'group' => 'Operations',
            'url' => '/reports',
        ]);
        $role = Role::query()->create([
            'name' => 'invalid_url_update',
            'guard_name' => 'web',
            'display_name' => 'Invalid URL update',
            'navigation_items' => [$customItem['key'], 'dashboard'],
            'custom_navigation_items' => [$customItem],
        ]);
        $role->syncPermissions(['dashboard.view']);
        $navigationBefore = $role->navigation_items;
        $customItemsBefore = $role->custom_navigation_items;
        $permissionsBefore = $role->permissions()->orderBy('name')->pluck('name')->all();
        $auditCount = AccessAuditEvent::query()->count();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.roles.edit', $role))
            ->patch(route('access.roles.update', $role), [
                'name' => 'invalid_url_update',
                'display_name' => 'Invalid URL update',
                'permissions' => ['dashboard.view', 'files.view'],
                'navigation_items' => ['dashboard'],
                'custom_navigation_items' => [$this->customItem([
                    'title' => 'Reports',
                    'group' => 'Changed group',
                    'url' => 'javascript:alert(1)',
                    'iconKey' => 'activity',
                ])],
            ])
            ->assertSessionHasErrors('custom_navigation_items.0.url');

        $freshRole = $role->fresh();
        $this->assertSame($navigationBefore, $freshRole->navigation_items);
        $this->assertCustomNavigationItems($customItemsBefore, $freshRole->custom_navigation_items);
        $this->assertSame($permissionsBefore, $freshRole->permissions()->orderBy('name')->pluck('name')->all());
        $this->assertDatabaseCount('access_audit_events', $auditCount);
    }

    public function test_missing_navigation_selection_is_normalized_to_an_explicit_empty_list(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), [
                'name' => 'no_navigation',
                'display_name' => 'No navigation',
                'permissions' => ['dashboard.view'],
            ])
            ->assertRedirect(route('access.roles.index'));

        $role = Role::query()->where('name', 'no_navigation')->firstOrFail();
        $this->assertSame([], $role->navigation_items);
    }

    public function test_saving_an_empty_selection_hides_all_shared_navigation(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $role = Role::query()->create([
            'name' => 'empty_menu',
            'guard_name' => 'web',
            'display_name' => 'Empty menu',
            'navigation_items' => ['dashboard'],
        ]);
        $role->syncPermissions(['dashboard.view']);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.roles.update', $role), [
                'name' => 'empty_menu',
                'display_name' => 'Empty menu',
                'permissions' => ['dashboard.view'],
                'navigation_items' => [],
            ])
            ->assertRedirect(route('access.roles.index'));

        $this->assertSame([], $role->fresh()->navigation_items);
        $this->assertSame([], $role->fresh()->custom_navigation_items);

        $user = User::factory()->create();
        $user->syncRoles($role->fresh());

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('auth.navigation', []));
    }

    public function test_selected_navigation_does_not_grant_the_destination_permission(): void
    {
        $this->seed(RbacSeeder::class);
        $role = Role::query()->create([
            'name' => 'menu_without_access',
            'guard_name' => 'web',
            'display_name' => 'Menu without access',
            'navigation_items' => ['dashboard', 'users'],
        ]);
        $role->syncPermissions(['dashboard.view']);
        $user = User::factory()->create();
        $user->syncRoles($role);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation', [[
                    'label' => 'Platform',
                    'items' => [[
                        'key' => 'dashboard',
                        'title' => 'Dashboard',
                        'href' => route('dashboard'),
                        'iconKey' => 'layoutGrid',
                    ]],
                ]]));

        $this->get(route('access.users.index'))->assertForbidden();
    }

    public function test_legacy_role_audit_records_its_resolved_navigation_before_value(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $role = Role::query()->create([
            'name' => 'legacy_menu_audit',
            'guard_name' => 'web',
            'display_name' => 'Legacy menu audit',
            'navigation_items' => null,
        ]);
        $role->syncPermissions(['dashboard.view', 'files.view']);

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.roles.update', $role), [
                'name' => 'legacy_menu_audit',
                'display_name' => 'Legacy menu audit',
                'permissions' => ['dashboard.view', 'files.view'],
                'navigation_items' => ['dashboard'],
            ])
            ->assertRedirect(route('access.roles.index'));

        $updated = AccessAuditEvent::query()->where('event', 'role.updated')->firstOrFail();
        $this->assertSame(['notifications', 'dashboard', 'files'], $updated->before['navigation_items']);
        $this->assertSame(['dashboard'], $updated->after['navigation_items']);
    }

    public function test_navigation_validation_rejects_unknown_duplicate_and_oversized_lists(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $payload = [
            'name' => 'invalid_navigation',
            'display_name' => 'Invalid navigation',
            'permissions' => [],
        ];

        $this->actingAs($admin)->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'navigation_items' => ['not_in_catalog']])
            ->assertSessionHasErrors('navigation_items.0');

        $this->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'navigation_items' => ['dashboard', 'dashboard']])
            ->assertSessionHasErrors('navigation_items.1');

        $this->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'navigation_items' => array_fill(0, 33, 'dashboard')])
            ->assertSessionHasErrors('navigation_items');

        $this->withSession(['auth.password_confirmed_at' => time()])
            ->from(route('access.roles.create'))
            ->post(route('access.roles.store'), [...$payload, 'navigation_items' => ['destination' => 'dashboard']])
            ->assertSessionHasErrors('navigation_items');

        $this->assertDatabaseMissing('roles', ['name' => 'invalid_navigation']);
    }

    public function test_role_create_and_edit_pages_include_the_navigation_editor_catalog_and_selection(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $role = Role::query()->create([
            'name' => 'menu_editor',
            'guard_name' => 'web',
            'display_name' => 'Menu editor',
            'navigation_items' => ['files', 'users'],
        ]);
        $role->syncPermissions(['dashboard.view', 'files.view']);

        $this->actingAs($admin)
            ->get(route('access.roles.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/role-create')
                ->has('navigationItems', 14)
                ->where('navigationItems.0.key', 'notifications')
                ->where('navigationItems.0.group', 'Platform')
                ->where('navigationItems.0.href', route('notifications.index', [], false))
                ->where('navigationItems.7.key', 'assets')
                ->where('navigationItems.7.group', 'Operations')
                ->where('navigationItems.7.href', route('assets.index', [], false))
                ->where('navigationItems.13.key', 'backups')
                ->where('customNavigationItems', [])
                ->has('customNavigationIconKeys')
                ->has('routeOptions')
                ->where('defaultNavigationItems', app(NavigationCatalog::class)->keys()));

        $this->get(route('access.roles.edit', $role))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('access/role-edit')
                ->where('role.navigationItems', ['files', 'users'])
                ->has('navigationItems', 14)
                ->has('routeOptions'));
    }

    public function test_route_picker_includes_authenticated_page_routes_and_excludes_non_linkable_routes(): void
    {
        Route::domain('{account}.example.test')
            ->middleware(['web', 'auth'])
            ->get('route-picker-domain-test', [RoleController::class, 'create'])
            ->name('testing.route-picker.domain');

        Route::middleware(['api', 'auth'])
            ->get('route-picker-api-test', [RoleController::class, 'create'])
            ->name('testing.route-picker.api');

        Route::middleware(['web', 'auth'])
            ->post('route-picker-post-test', [RoleController::class, 'create'])
            ->name('testing.route-picker.post');

        $options = app(NavigationCatalog::class)->routeOptions();
        $names = array_column($options, 'name');

        $this->assertContains('dashboard', $names);
        $this->assertContains('access.roles.create', $names);
        $this->assertContains('notifications.index', $names);
        $this->assertContains('system-settings.backups.index', $names);
        $this->assertNotContains('home', $names);
        $this->assertNotContains('access.users.show', $names);
        $this->assertNotContains('notifications.summary', $names);
        $this->assertNotContains('system-settings.backups.status', $names);
        $this->assertNotContains('system-settings.backups.tables', $names);
        $this->assertNotContains('testing.route-picker.domain', $names);
        $this->assertNotContains('testing.route-picker.api', $names);
        $this->assertNotContains('testing.route-picker.post', $names);

        $dashboard = collect($options)->firstWhere('name', 'dashboard');
        $this->assertSame(route('dashboard', [], false), $dashboard['path']);
    }

    public function test_role_create_authorization_remains_enforced_for_navigation_submission(): void
    {
        $this->seed(RbacSeeder::class);
        $user = User::factory()->create();
        $user->syncRoles(RoleName::User->value);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->post(route('access.roles.store'), [
                'name' => 'unauthorized_navigation',
                'display_name' => 'Unauthorized navigation',
                'navigation_items' => ['custom_123e4567-e89b-12d3-a456-426614174000'],
                'custom_navigation_items' => [$this->customItem()],
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('roles', ['name' => 'unauthorized_navigation']);
    }

    public function test_admin_cannot_patch_navigation_on_a_protected_system_role(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $systemRole = Role::query()->where('name', RoleName::User->value)->firstOrFail();
        $navigationBefore = $systemRole->navigation_items;

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.roles.update', $systemRole), [
                'name' => $systemRole->name,
                'display_name' => $systemRole->display_name,
                'description' => $systemRole->description,
                'permissions' => ['dashboard.view'],
                'navigation_items' => [],
            ])
            ->assertForbidden();

        $this->assertSame($navigationBefore, $systemRole->fresh()->navigation_items);
    }

    public function test_shared_navigation_uses_role_selection_and_permission_checks(): void
    {
        $this->seed(RbacSeeder::class);
        $user = User::factory()->create();
        $user->syncRoles(RoleName::User->value);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation', [
                    ['label' => 'Platform', 'items' => [
                        ['key' => 'notifications', 'title' => 'Notifications', 'href' => route('notifications.index'), 'iconKey' => 'bell'],
                        ['key' => 'dashboard', 'title' => 'Dashboard', 'href' => route('dashboard'), 'iconKey' => 'layoutGrid'],
                    ]],
                    ['label' => 'System', 'items' => [
                        ['key' => 'files', 'title' => 'Files', 'href' => route('files.index'), 'iconKey' => 'files'],
                    ]],
                ]));

        $restrictedRole = Role::query()->create([
            'name' => 'restricted_menu',
            'guard_name' => 'web',
            'display_name' => 'Restricted menu',
            'navigation_items' => ['dashboard', 'users', 'backups'],
        ]);
        $restrictedRole->syncPermissions(['dashboard.view']);
        $user->syncRoles($restrictedRole);

        $this->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation', [[
                    'label' => 'Platform',
                    'items' => [[
                        'key' => 'dashboard',
                        'title' => 'Dashboard',
                        'href' => route('dashboard'),
                        'iconKey' => 'layoutGrid',
                    ]],
                ]]));
    }

    public function test_role_navigation_order_is_saved_edited_and_shared_across_group_segments(): void
    {
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create();
        $admin->syncRoles(RoleName::Admin->value);
        $role = Role::query()->create([
            'name' => 'ordered_menu',
            'guard_name' => 'web',
            'display_name' => 'Ordered menu',
            'navigation_items' => [],
        ]);

        $orderedSelection = ['dashboard', 'users', 'roles', 'notifications', 'files'];

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->patch(route('access.roles.update', $role), [
                'name' => 'ordered_menu',
                'display_name' => 'Ordered menu',
                'permissions' => ['dashboard.view', 'users.view', 'files.view'],
                'navigation_items' => $orderedSelection,
            ])
            ->assertRedirect(route('access.roles.index'));

        $this->assertSame($orderedSelection, $role->fresh()->navigation_items);

        $this->get(route('access.roles.edit', $role))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('role.navigationItems', $orderedSelection));

        $user = User::factory()->create();
        $user->syncRoles($role->fresh());

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('auth.navigation', [
                [
                    'label' => 'Platform',
                    'items' => [[
                        'key' => 'dashboard',
                        'title' => 'Dashboard',
                        'href' => route('dashboard'),
                        'iconKey' => 'layoutGrid',
                    ]],
                ],
                [
                    'label' => 'Access',
                    'items' => [[
                        'key' => 'users',
                        'title' => 'Users',
                        'href' => route('access.users.index'),
                        'iconKey' => 'users',
                    ]],
                ],
                [
                    'label' => 'Platform',
                    'items' => [[
                        'key' => 'notifications',
                        'title' => 'Notifications',
                        'href' => route('notifications.index'),
                        'iconKey' => 'bell',
                    ]],
                ],
                [
                    'label' => 'System',
                    'items' => [[
                        'key' => 'files',
                        'title' => 'Files',
                        'href' => route('files.index'),
                        'iconKey' => 'files',
                    ]],
                ],
            ]));
    }

    public function test_legacy_null_selection_keeps_permission_filtered_navigation(): void
    {
        $this->seed(RbacSeeder::class);
        $legacyRole = Role::query()->create([
            'name' => 'legacy_menu',
            'guard_name' => 'web',
            'display_name' => 'Legacy menu',
            'navigation_items' => null,
        ]);
        $legacyRole->syncPermissions(['dashboard.view', 'files.view']);
        $user = User::factory()->create();
        $user->syncRoles($legacyRole);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation', [
                    ['label' => 'Platform', 'items' => [
                        ['key' => 'notifications', 'title' => 'Notifications', 'href' => route('notifications.index'), 'iconKey' => 'bell'],
                        ['key' => 'dashboard', 'title' => 'Dashboard', 'href' => route('dashboard'), 'iconKey' => 'layoutGrid'],
                    ]],
                    ['label' => 'System', 'items' => [
                        ['key' => 'files', 'title' => 'Files', 'href' => route('files.index'), 'iconKey' => 'files'],
                    ]],
                ]));
    }

    public function test_backup_navigation_is_shared_only_with_an_active_super_admin(): void
    {
        $this->seed(RbacSeeder::class);
        $user = User::factory()->create();
        $customRole = Role::query()->create([
            'name' => 'backup_selected',
            'guard_name' => 'web',
            'display_name' => 'Backup selected',
            'navigation_items' => ['dashboard', 'backups'],
        ]);
        $customRole->syncPermissions(['dashboard.view']);
        $user->syncRoles($customRole);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation.0.items.0.key', 'dashboard')
                ->missing('auth.navigation.2.items.4'));

        $superAdmin = User::factory()->create();
        $superAdmin->syncRoles(RoleName::SuperAdmin->value);

        $this->actingAs($superAdmin)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('auth.navigation.2.items.4.key', 'backups')
                ->where('auth.navigation.2.items.4.href', route('system-settings.backups.index')));

        $superAdmin->forceFill(['status' => UserStatus::Suspended])->save();
        $this->assertSame([], app(NavigationCatalog::class)->forUser($superAdmin->fresh()));
    }

    public function test_guest_receives_an_empty_shared_navigation(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('auth.navigation', []));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array{key: string, title: string, group: string, url: string, iconKey: string}
     */
    private function customItem(array $overrides = []): array
    {
        return array_replace([
            'key' => 'custom_123e4567-e89b-12d3-a456-426614174000',
            'title' => 'Custom destination',
            'group' => 'Custom links',
            'url' => '/reports',
            'iconKey' => 'link',
        ], $overrides);
    }

    /**
     * @param  array<int, array<string, string>>  $expected
     * @param  array<int, array<string, string>>  $actual
     */
    private function assertCustomNavigationItems(array $expected, array $actual): void
    {
        $this->assertSame(
            $this->normalizeCustomNavigationItems($expected),
            $this->normalizeCustomNavigationItems($actual),
        );
    }

    /**
     * @param  array<int, array<string, string>>  $items
     * @return array<int, array{key: string, title: string, group: string, url: string, iconKey: string}>
     */
    private function normalizeCustomNavigationItems(array $items): array
    {
        return array_map(fn (array $item): array => [
            'key' => $item['key'],
            'title' => $item['title'],
            'group' => $item['group'],
            'url' => $item['url'],
            'iconKey' => $item['iconKey'],
        ], $items);
    }
}
