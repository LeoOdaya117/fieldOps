# Make Role Permissions Match Resource Actions

**Status:** Complete

## Summary

Replace coarse `manage` permissions with action-level permissions and complete the CRUD workflows for mutable resource models. Keep Audit and Visit Logs append-only/read-only, Dashboard view-only, and system settings limited to view and update. Preserve existing grants when migrating roles.

## Implementation Changes

- Define granular `view`, `create`, `update`, and `delete` permissions for Users, Roles, Countries, Timezones, IP Blocks, Organization Locations, and Media Assets. Keep domain-specific actions such as inviting users and assigning roles. Replace `settings.manage_system` with `settings.view` and `settings.update`.
- Add the missing Organization Location create/delete operations on the existing address and map settings surfaces. It remains a single primary record; create is available only when no primary row exists, update only when it is active, and an inactive location must be restored before editing. Delete marks it inactive, and the status control can restore it.
- Add Media Asset view/create/update/delete authorization. Create remains upload; update renames the displayed original name; delete marks the record inactive. Retain its stored files while inactive so restoration works. Keep file storage fields immutable and preserve existing asset safeguards.
- Expose `view_deleted` and `update_deleted` for every `HasRecordStatus` resource. Keep Audit and Visit Logs view-only and Dashboard view-only; do not add status actions to the log models.
- Apply each permission server-side, expose matching page capabilities to the UI, and show the resulting actions in the role editor. Keep IP block `is_active` separate from `record_status`, with ordinary updates governing activation.
- Add a forward migration that replaces old `*.manage` grants with equivalent create/update/delete grants, maps `settings.manage_system` to view/update, and preserves existing custom-role capabilities. Update seed defaults and RBAC documentation.

## Role Defaults and Assumptions

- Super Admin remains the sole elevated role and retains all permissions. Admin receives the resource actions and deleted-record actions it currently manages. User keeps Dashboard access and receives Media Asset view/create/update/delete for their own assets to preserve current image-picker behavior; User receives no deleted-record permissions.
- Organization Location create initializes the primary record; update changes its address/map values; delete soft-deactivates it.
- Address/map save forms are disabled when the primary location is inactive; the user restores it with the status control before editing. Location deactivation requires both `organization_locations.delete` and `settings.update` because it changes configuration from the system-settings surfaces.
- Media Asset update renames only. Inactive files remain stored for restoration; permanent file cleanup is outside this change.
- Audit and Visit Logs retain only their current view permissions. Settings has view/update; Dashboard has view.

## Tests and Acceptance

- Test migration of built-in and custom-role grants from `manage` permissions, plus the seeded permission matrix and role-editor labels.
- Test allowed and denied create/update/delete operations, including Media Asset upload/rename/deactivation/restoration, ownership and assigned-slot safeguards, and Organization Location create/update/deactivation/restoration.
- Test `view_deleted` and `update_deleted` enforcement, ensuring inactive records cannot be revealed through crafted requests and IP-block activation stays independent.
- Test Settings view/update authorization and confirm Audit, Visit Logs, and Dashboard remain read-only/view-only.
- Run Laravel feature tests, frontend tests, TypeScript, formatting, ESLint, Pint, PHPStan, and the production build.

## Progress and Verification

- 2026-09-26: Saved the approved conversational plan here before application-code edits. The previous status-control and three-role implementation is uncommitted existing work and is being preserved.
- 2026-09-26: Locked implementation contracts with the backend and frontend specialists. `delete` deactivates; `update_deleted` authorizes either status-switch transition; `view_deleted` controls inactive visibility. Organization Location address/map saves create the singleton only when none exists and update it while active; the existing inactive row cannot be duplicated or edited until restored. Explicit delete/status endpoints are available. Media Asset content remains uploader-scoped (including Super Admin), inactive content requires `view_deleted`, and retained inactive files continue to count toward the owner's quota.
- 2026-09-26: The legacy `settings.manage_system` grant will also map to organization-location view/create/update so existing address/map operators keep access after settings and location permissions are separated. Admin's seeded defaults include the full mutable-resource action set; User receives only own-media CRUD among those resource actions. Audit, Visit Logs, and Dashboard remain view-only as approved.
- 2026-09-26: Added a shared role-dependency guard to status changes, single deletion, and bulk deletion. It prevents deactivation while users are assigned or while any unaccepted, unrevoked invitation references the role, including expired or inactive invitations that remain visible in the Users screen. Address/map capabilities are contextual: an existing inactive singleton has neither create nor update available until restored. Media rename/delete controls are hidden for inactive assets.
- Verification: full PHPUnit passed (174 tests, 1,581 assertions; direct invocation enabled the locally installed SQLite extensions because the default PHP CLI does not load them). Full Vitest passed (119 tests across 30 files). TypeScript, ESLint, Prettier, Pint, PHPStan, and the production build passed. Vite emitted a non-failing chunk-size warning for the Mapbox bundle (~1.8 MB). An initial full frontend run exposed fixture capability omissions and test timeouts under parallel load; those were corrected, and the full rerun passed. No database reset or destructive local database command was run.
