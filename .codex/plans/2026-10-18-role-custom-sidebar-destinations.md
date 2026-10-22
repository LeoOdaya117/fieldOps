# Role-specific custom sidebar destinations

## Goal

Extend the role Navigation tab so an administrator can add destinations for that role and customize each custom destination's title, group label, URL, and icon. Keep built-in destinations and the existing default menus for User, Admin, and Super Admin.

## Success criteria

- Role administrators can add, edit, remove, select, and order custom destinations in the existing Navigation tab.
- Each custom destination stores a stable key, title, group label, URL, and an allowlisted Lucide icon key.
- Role menus can mix built-in and custom destinations in one global order. The sidebar groups adjacent entries with matching group labels and preserves item order.
- New built-in role defaults, existing built-in role data, explicit empty selections, and legacy null-selection behavior remain intact.
- Custom URL validation accepts only single-leading-slash app paths or absolute HTTPS URLs; it rejects script schemes, protocol-relative URLs, credentials, whitespace/control characters, and backslashes.
- Custom icons are resolved through a finite server/client allowlist; user supplied HTML/SVG is never rendered.
- Custom links do not grant permissions. Existing route middleware and policies remain authoritative for app paths.
- Sidebar, header, and alternate shell navigation render external HTTPS destinations as regular anchors and app paths through Inertia navigation.

## Existing contract

- `roles.navigation_items` is a nullable ordered list of built-in catalog keys. `null` preserves the former permission-derived menu; `[]` explicitly hides destinations.
- `config/navigation.php` and `App\Support\NavigationCatalog` define built-in destination routes, groups, icons, permissions, and Super Admin restrictions.
- The role form already has Details, Navigation, and Permissions tabs; the Navigation tab has one selection/order list.
- The server resolves role navigation into `auth.navigation`, consumed by shared navigation helpers and all app shells.

## Implementation approach

### Persistence and API

1. Add nullable JSON `roles.custom_navigation_items`, cast it as an array, and leave existing `navigation_items` values and built-in seeder defaults unchanged.
2. Store each custom item as `{key, title, group, url, iconKey}`. Keys use a prefixed UUID and are role-local. Bound each role to 20 custom destinations and 32 total menu entries.
3. Keep `navigation_items` as the ordered list of selected built-in keys and custom keys. Validate every key against either the server-owned catalog or the submitted custom-item list, reject duplicates, and allow an empty list.
4. Validate custom fields with bounded strings and an icon allowlist. Validate URLs as either a single-leading-slash app path or credential-free HTTPS URL; do not support HTML/SVG, arbitrary schemes, or new-tab behavior in this version.
5. Save both navigation fields with role details and permissions in the existing transaction. Include selected keys and custom metadata in audit before/after values.
6. Extend `NavigationCatalog` to resolve built-in and role-owned custom metadata in selected order. Apply existing permission and Super Admin checks to built-in items; custom paths remain subject to their destination's own authorization.

### Role editor and navigation rendering

1. Keep built-in destinations in the current list and add custom destinations with their group label shown in the same ordered list.
2. Add a compact inline form/disclosure in the Navigation tab with fields for title, group label, URL, and icon. New items are selected at the end of the order. Custom rows can be edited or removed; all rows retain selection and move controls.
3. Preserve form state and route validation feedback. Validation errors on nested custom-item fields activate the Navigation tab and are announced next to the relevant control.
4. Add a curated Lucide icon set shared by the request allowlist and TypeScript icon map. Preview the chosen icon in the editor and render only mapped components.
5. Preserve server ordering and groups in every app shell. Use Inertia `Link` for app-relative paths and anchors for HTTPS links; prevent external paths from matching internal active navigation.

## Likely files

- `database/migrations/` and `app/Models/Role.php`
- `app/Http/Requests/Access/SaveRoleRequest.php`
- `app/Http/Controllers/Access/RoleController.php`
- `app/Support/NavigationCatalog.php` and `config/navigation.php`
- `resources/js/features/access/components/role-form.tsx`
- `resources/js/types/navigation.ts`, `resources/js/lib/navigation.ts`, and shared nav renderers
- `resources/js/components/nav-main.tsx`, app header/sidebar, alternate shells, and mobile/platform navigation components where href handling is centralized
- `tests/Feature/Access/RoleNavigationTest.php`, frontend access/navigation tests, and `tests/e2e/access.spec.ts`

## Acceptance tests

### Backend

- Migration adds and rolls back the nullable JSON column without rewriting existing rows.
- Role create/update persists ordered built-in and custom entries, returns custom data on edit, and records before/after audit values.
- User/Admin/Super Admin seed defaults are unchanged; re-seeding preserves role customizations.
- Mixed navigation preserves the exact order and contiguous group segments in `auth.navigation`.
- Invalid keys, duplicate keys, duplicate custom IDs, excess counts, malformed item shapes, unknown icon keys, and unsafe URLs fail validation without partial role or audit writes.
- Guest and unauthorized role editors cannot create or update custom navigation; protected system-role authorization remains enforced.
- Custom links never synthesize permissions; built-in permission filtering and Super Admin-only restrictions still apply.
- Legacy null and explicit-empty selection behavior remains covered.

### Frontend and browser

- Add/edit/remove custom item interactions submit the exact metadata and order; invalid server feedback retains edits and opens Navigation tab.
- Icon preview and sidebar rendering use only allowlisted icon components.
- App-relative custom links use Inertia navigation; HTTPS custom links use anchors and do not match an internal route as active.
- Keyboard users can operate fields, icon selection, selection checkboxes, edit/remove, and move controls with visible focus.
- Navigation editor and sidebar are checked for light/dark theme and narrow/mobile, tablet, and desktop widths without horizontal overflow.

## Scope update — draggable ordering (2026-10-18)

The role Navigation tab also supports dragging selected destinations by a dedicated handle to change their shared order. Dragging reuses the existing `navigation_items` form value and does not change persistence. The move-up and move-down buttons remain available as keyboard and touch-friendly alternatives. Drag-and-drop reordering across group labels is covered by a frontend test.

## Scope update — role-managed sidebar group labels (2026-10-18)

Role administrators can add group labels and assign built-in destinations to those labels. Built-in group overrides are stored per role; custom destinations continue to use their existing group field. A sidebar group appears when at least one selected, accessible destination uses its label. Missing overrides preserve the Platform, Access, and System catalog defaults, and group labels do not change destination permissions.

## Assumptions

- Custom destinations belong to the role being edited; there is no separate global destination registry in this version.
- Built-in catalog entries retain developer-owned labels, URLs, permissions, and icons. The administrator customizes the fields of custom entries.
- Custom app paths are presentation links only. Route-level policies and middleware continue to decide access.
- External links use HTTPS and open in the same tab.

## Build progress

- **Status:** Implemented; browser-level verification remains blocked by the local E2E account configuration.
- **Architecture review:** Completed read-only mapping; additive JSON metadata beside the existing ordered key list preserves the existing menu contract and defaults.
- **QA planning:** Completed read-only acceptance and failure-path mapping for persistence, authorization, URL/icon validation, all navigation consumers, accessibility, and responsive behavior.
- **Implementation:** Added a nullable `custom_navigation_items` JSON field and kept `navigation_items` as the global ordered key list. The role Navigation tab supports adding, editing, removing, selecting, and reordering custom destinations with a group label, safe URL, and allowlisted icon. Selected destinations can be dragged by a dedicated handle across groups; move buttons remain as keyboard and touch-friendly alternatives. Dragging submits through the existing ordered `navigation_items` list. Shared navigation renders app paths through Inertia and HTTPS links as same-tab anchors. Custom links remain independent of permission grants. The editor now focuses the title field when opened, restores focus after close/add/remove, and allows discarding unfinished drafts.
- **Security review:** Completed with no actionable findings. Custom URLs are restricted to app-relative paths or credential-free HTTPS; icon values are allowlisted; role updates retain policy authorization; custom links do not grant access.
- **QA review:** Completed. Added coverage for unfinished drafts not blocking role submission, app-path versus HTTPS rendering through `NavMain`, invalid PATCH atomicity, and migration rollback.
- **Verification completed:**
  - `php -d extension=php_pdo_sqlite.dll vendor/bin/phpunit --filter=RoleNavigationTest --do-not-cache-result` — passed, 20 tests and 256 assertions.
  - `npm.cmd run types:check` — passed.
  - `npm.cmd run lint:check` and `npm.cmd run format:check` — passed across the frontend.
  - Focused Vitest across access, sidebar, platform-shell, navigation manifest, and `NavMain` — passed, 37 tests. The full frontend unit suite passed, 39 files and 288 tests; unrelated jsdom canvas warnings appeared in Mapbox tests.
  - `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, and `git diff --check` — passed.
- **Browser verification:** The role-navigation Playwright attempt stopped during global setup because the configured E2E administrator credentials were rejected; the test itself did not run. No live role was saved during manual inspection.
- **Build verification:** Not rerun in this extension. The preceding local build attempt for this navigation work was blocked by Windows `EPERM` while Vite wrote/cleared temporary and `public/build` output paths.
- **Drag-order verification:** `npm.cmd run test:unit -- --run tests/Frontend/access.test.tsx` passed with 23 tests. TypeScript, ESLint on the changed frontend files, Prettier on the changed files, and `git diff --check` passed.
- **Role-managed group labels (2026-10-18):** Added a group-label manager to the Navigation tab. Administrators can add labels and assign them to built-in or custom destinations; built-in assignments persist as role-specific overrides, and custom assignments persist with each custom destination. Unused labels do not create empty sidebar headings.
- **Group-label verification:** Direct PHPUnit with SQLite extensions passed (22 tests, 308 assertions). The access and sidebar consumer Vitest suite passed (40 tests across five files); TypeScript, targeted ESLint, Prettier, and `git diff --check` passed. The role-navigation Playwright spec was updated but global setup rejected the configured E2E administrator credentials.
