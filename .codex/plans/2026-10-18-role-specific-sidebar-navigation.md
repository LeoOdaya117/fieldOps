# Role-specific sidebar navigation

## Goal

Let an administrator choose which existing sidebar destinations each role sees. Keep navigation easy to configure from the existing role create/edit flow, and give the built-in User, Admin, and Super Admin roles intentional defaults.

## Success criteria

- Each role can save its own selection of available sidebar links.
- The sidebar renders that role's selection for signed-in users.
- A link appears only when it is selected for the role and the user still has the permission required by its destination. Super Admin-only destinations remain restricted to active Super Admins.
- Built-in role defaults match the current sidebar behavior:
  - **User:** Notifications, Dashboard, Files.
  - **Admin:** Notifications, Dashboard, Users, Roles, Access audit, Blocked IPs, Visit logs, Files, Countries, Timezones, System settings.
  - **Super Admin:** the Admin set plus Backup & Restore.
- Each destination appears once in a single accessible list. Its checkbox sets visibility, and selected rows show their position and move-up/move-down controls. There are no arbitrary URLs, HTML icon fields, nested menu editing, or drag-and-drop ordering.
- Each role stores and renders its own global order, including across Platform, Access, and System destinations.
- Existing roles keep their current permission-driven menu until an administrator saves a custom selection.

## Baseline before implementation

- `resources/js/lib/navigation.ts` defines the Platform, Access, and System groups and filters their links using shared authorization props.
- `resources/js/components/app-sidebar.tsx` and `resources/js/components/app-header.tsx` render those groups through the same helper.
- `HandleInertiaRequests` shares the user's first role and permissions, but no navigation selection.
- Role creation and editing already use `RoleController`, `SaveRoleRequest`, and `resources/js/features/access/components/role-form.tsx`. `config/rbac.php` and `RbacSeeder` define the three built-in roles.
- Route middleware and policies enforce permissions independently of the sidebar.

## Implementation approach

### 1. Keep a fixed, approved navigation catalog

Add `config/navigation.php` as the server-owned catalog for current sidebar destinations. Give each item a stable key, group, display title, named Laravel route, icon key, optional required permission, and optional Super Admin-only flag. Catalog order supplies defaults and the initial order for new roles; each saved role selection controls both inclusion and global order.

Add a small navigation formatter/resolver that reads this catalog, resolves named routes to URLs, supplies the editor's safe item metadata, and builds the current user's visible groups. This keeps the allowlist, sidebar filtering, and request validation based on the same keys. Keep Lucide component selection in the frontend by mapping the catalog's icon keys to existing icons.

### 2. Store per-role selections

Add a nullable JSON `navigation_items` column to `roles`, cast it on `App\Models\Role`, and store an ordered list of catalog keys. A nullable field preserves current behavior for roles that predate this feature: resolve any unconfigured role to catalog order filtered by its permissions and Super Admin status. Once saved, an explicit ordered list (including an empty list) overrides that fallback. Newly seeded built-in roles receive their configured defaults in the declared order.

Add a `navigation` list to each built-in role definition in `config/rbac.php`. Update `RbacSeeder` to initialize new built-in roles from these defaults, while preserving existing roles and any non-null selection an administrator has already saved. Do not add a navigation table or store route URLs, labels, icons, or HTML in the database.

### 3. Extend the existing role form

Pass the navigation catalog to role create/edit pages from `RoleController`, along with resolved selected keys in saved order. In `RoleForm`, show each destination once in a single ordered list. Each row includes a visibility checkbox and group label; checked rows appear first in their saved order with accessible move-up/move-down controls, and unchecked rows follow in catalog order. On create, preselect the available catalog in default order so the permission filter retains today's behavior unless the administrator opts to hide links. On edit, preselect the saved or resolved role selection in its effective order. Explain that a selected link remains hidden when its required permission is absent.

Validate submitted keys against the catalog in `SaveRoleRequest`, reject unknown or duplicate keys, bound the list to catalog size, and normalize an empty selection to `[]`. Persist it in the same transaction as role details and permissions. Include navigation keys in the role-created/role-updated audit before/after payloads so menu changes are reviewable.

### 4. Render the role menu from shared Inertia data

Extend `HandleInertiaRequests` to resolve the user's single assigned role's ordered keys and share route-resolved `auth.navigation` items in that exact order. Represent adjacent items from the same display group as a segment; repeated group labels are allowed when a role's global order crosses groups. The role assignment pivot enforces one role per user, so no multi-role merge is needed. Include an item only when it is selected, its required permission is held (unless it has no permission requirement), and any Super Admin-only condition is satisfied. Every app layout must preserve the order from this shared prop. Keep route authorization unchanged; hiding or reordering a link is only presentation.

## Main boundaries likely to change

- `config/navigation.php`, `config/rbac.php`
- `app/Models/Role.php`
- `app/Support/` navigation catalog/resolver (small focused helper)
- `app/Http/Controllers/Access/RoleController.php`
- `app/Http/Requests/Access/SaveRoleRequest.php`
- `app/Http/Middleware/HandleInertiaRequests.php`
- `database/migrations/` (nullable JSON column)
- `database/seeders/RbacSeeder.php`
- `resources/js/features/access/components/role-form.tsx`
- `resources/js/pages/access/role-create.tsx` and `role-edit.tsx` types/props as needed
- `resources/js/components/app-sidebar.tsx`, `resources/js/components/app-header.tsx`, `resources/js/lib/navigation.ts`, `resources/js/types/auth.ts`, `resources/js/types/navigation.ts`, and `resources/js/types/global.d.ts`
- `tests/Feature/Access/RbacTest.php`, `tests/Feature/Access/DefaultAccountsSeederTest.php`, and `tests/Frontend/app-sidebar.test.tsx` / `access.test.tsx`

## Acceptance and test scenarios

### Backend

- A migration adds the nullable JSON field on supported databases and rolls back cleanly.
- Fresh seeding gives each built-in role the defaults listed above. Re-running the seeder preserves existing roles and saved navigation customizations.
- Existing roles with a null selection continue to resolve to their previous permission-based links; saved `[]` hides all sidebar and header destinations.
- Creating and updating roles stores selected keys atomically with permissions and records navigation changes in the existing access audit event.
- Creating and updating roles preserve a deliberately reordered list exactly through validation, database JSON, edit props, audit data, and `auth.navigation`, including order across group boundaries.
- Invalid, duplicate, or oversized keys fail validation; an explicitly empty selection is accepted.
- Unauthenticated users receive no role navigation. An authenticated user without the relevant permission never receives that link, even if its key is selected. Backup & Restore is never shared to a non-Super Admin.
- Existing role authorization remains intact: users without `roles.create`/`roles.update` cannot save selections, and Admin cannot edit protected system roles.

### Frontend

- Role forms display each catalog destination once, initialize the correct selection and order, support keyboard-accessible global move-up/move-down controls, submit the exact ordered keys, allow clearing all selections, and show validation errors accessibly.
- The sidebar renders only the groups/items supplied in `auth.navigation`; it does not expose a link omitted by the server.
- Existing navigation tests cover the three built-in defaults, a custom role with a reduced selection, and permission revocation hiding a selected link.
- Check the form and sidebar at narrow mobile, tablet, and desktop widths in light and dark themes; retain keyboard-operable checkboxes and visible focus.

## Assumptions and scope

- "Navigation creation" means selecting from the application's existing destinations. New routes are added by developers to the approved catalog; role administrators do not enter URLs or HTML.
- Catalog metadata and link destinations stay server-approved; each role can reorder its selected links globally. Nested parents remain outside this version.
- Permissions, route middleware, and policies remain the only authorization controls. Navigation configuration cannot grant access.
- `notifications` remains available to roles whose selection includes it because its existing destination has no separate permission. Other destinations retain their current permission requirements.
- No unresolved product choice is required before implementation.

## Build progress

- **Status:** Implemented.
- **Contract adjustment:** The server-provided menu drives the sidebar, app header, and alternate app layouts. Dashboard branding links only when Dashboard is in the user's resolved menu. Existing roles with null selections retain their permission-derived menu; newly seeded built-in roles receive configured defaults, and saved lists (including `[]`) override the fallback.
- **Architecture review:** Completed read-only review of current role persistence, Inertia props, navigation consumers, and route names.
- **Implementation:** Added the fixed navigation catalog, nullable JSON selection, User/Admin/Super Admin defaults, grouped role checklist, server-resolved shared menu, audit values, and feature/component/browser tests. Role updates use the role policy so Admin cannot bypass protected-system-role restrictions with a direct PATCH.
- **UI refinement:** Combined destination selection and ordering into one list after feedback identified that the separate checklist and selected-order list repeated every chosen destination. Each destination now appears once with its checkbox, category, current position when selected, and move controls. Follow-up feedback identified that the combined role form was still too long, so it now separates Role details, Navigation, and Permissions into keyboard-accessible tabs. Tab panels stay mounted to preserve edits, the save controls remain available, and validation errors open the relevant tab.
- **Security review:** Completed. One PATCH authorization gap was found and fixed; a regression test confirms a protected role's selection stays unchanged after a forbidden Admin request.
- **Verification completed:**
  - `php -d extension=php_pdo_sqlite.dll -d extension=php_sqlite3.dll vendor/bin/phpunit --filter "RoleNavigationTest|RbacTest|DefaultAccountsSeederTest" --do-not-cache-result` — passed, 47 tests and 479 assertions.
  - `npm.cmd run test:unit -- --run --configLoader runner` — passed, 38 files and 280 tests. Existing jsdom canvas warnings appeared in unrelated Mapbox tests.
  - After consolidating the role form into a single destination list, `node_modules/.bin/vitest.cmd run --configLoader runner tests/Frontend/access.test.tsx` — passed, 17 tests; TypeScript, ESLint, Prettier, and `git diff --check` passed for the updated form and tests.
  - After consolidating the role form and adding tabs, `node_modules/.bin/vitest.cmd run --configLoader runner tests/Frontend/access.test.tsx` — passed, 18 tests; `npm.cmd run types:check`, focused ESLint, Prettier, and `git diff --check` passed for the updated form and tests.
  - `npm.cmd run types:check`, `npm.cmd run lint:check`, `npm.cmd run format:check`, `npx.cmd prettier --check tests/e2e/access.spec.ts`, `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, and `git diff --check` — passed.
  - An initial `php artisan test` attempt failed because its child PHPUnit process did not load the CLI-only SQLite extension flags. Direct PHPUnit with the same installed extensions passed as listed above.
- **QA review:** Completed read-only integration review of ordered form state, request validation, saved/edit/shared sequence, permission filtering, and navigation consumers. Added backend and frontend coverage for cross-group reordering, serialization, selection changes, and repeated group segments. The security review found no authorization bypass; order changes only affect presentation.
- **Browser verification:** The earlier separated checklist/order UI passed the role navigation Playwright test in mobile, tablet, and desktop. After the single-list refinement, Playwright could not load the current source: the local `public/hot` URL pointed to stopped port 5173, and starting Vite was blocked by Windows `EPERM` in `node_modules/.vite-temp` / `node_modules/.vite/deps`. In a later browser session, the ignored `public/hot` marker was connected to the already-running Vite server, which served the current source; the live Edit Super Admin page was visually confirmed with the three tabs and their separate content. No role values were saved during this check. A new Playwright run for the tabbed UI has not been performed.
- **Build verification limit:** The standard build failed writing its temporary config bundle under `node_modules/.vite-temp`. Retrying with `--configLoader runner` transformed 2,434 modules, then hit `EPERM` clearing `public/build/assets`; a separate temporary `outDir` also could not be created. No build output was produced.

## Scope update — role-managed sidebar group labels (2026-10-18)

Role administrators can add labels and assign them to built-in or custom destinations from the Navigation tab. Built-in assignments are stored as per-role overrides; custom assignments stay with the custom destination. A sidebar heading appears only when a selected, accessible destination uses it, and labels do not change permissions.

- **Verification:** Focused PHPUnit passed (22 tests, 308 assertions); the access and sidebar consumer Vitest suite passed (40 tests across five files). TypeScript, targeted ESLint, Prettier, and `git diff --check` passed. The role-navigation Playwright spec was updated for the group manager but could not run because global setup rejected the configured E2E administrator credentials.

## Scope update — route suggestions for custom destinations (2026-10-18)

The custom destination URL field now includes a native datalist built from the approved navigation catalog. It shows each built-in route as a suggestion with its title and relative path, while keeping free-form app paths and HTTPS URLs supported. Adding a catalog route automatically adds it to the suggestions.

- **Verification:** Role navigation feature tests passed (22 tests, 310 assertions); access editor Vitest passed (25 tests). TypeScript, targeted ESLint, Prettier, PHPStan for `NavigationCatalog`, Pint for that file, and `git diff --check` passed.
