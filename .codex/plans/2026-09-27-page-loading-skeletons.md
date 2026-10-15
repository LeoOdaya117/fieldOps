# Standardize page loading with skeletons

## Goal

Replace the default page navigation progress bar with responsive, accessible skeletons for first load and in-app page visits. Keep operation-specific indicators for forms, uploads, notifications, and other local actions.

## Approved implementation

- Build reusable skeleton layouts for dashboard, list, detail, form, settings, auth, and landing pages using the existing `Skeleton` primitive and semantic theme tokens.
- Assign every current page to a family. Use the destination URL to choose a skeleton during navigation and a generic skeleton as the automatic fallback for future or unmapped pages. Document how to select a more specific family for new pages.
- Track Inertia page visits centrally. After a short delay (default: 200 ms), replace the page content with its family skeleton while retaining the shared shell. Clear it on completion, cancellation, or failure; do not show it for local operation loading.
- Render a matching boot skeleton from the server page component before React mounts, then remove it when the app is ready. Remove the Inertia progress bar configuration for page visits.

## Acceptance criteria

- Every current page resolves to the appropriate skeleton family; future or unmapped pages receive the generic skeleton automatically.
- Initial page loading displays a boot skeleton until React is ready. In-app GET visits show the destination family's skeleton after 200 ms while retaining the shared shell.
- Fast visits do not flash a skeleton. Success, cancellation, and failure clear it. Local mutation, form, upload, notification, and widget loading remains purpose-built.
- Skeletons are responsive, accessible, light/dark compatible, and respect reduced motion.
- Tests cover family resolution, loading lifecycle, generic fallback, first-load fallback removal, and the shell-less landing page.

## Test scenarios

- Family resolver coverage for current landing, dashboard, list, detail, form, settings, and auth routes plus an unknown path.
- Delayed GET visit shows the target family; fast GET visit does not flash; finish, cancellation, and failures clear the placeholder; non-GET visits do not show page skeletons.
- Boot fallback is emitted with the correct page component family and disappears when the app mounts.
- Accessible status and busy state, light/dark token use, narrow and wide responsive layouts, and reduced-motion behavior.

## Progress

- [x] Save the approved plan and inspect the repository state.
- [x] Complete architecture and QA mapping; confirm implementation boundaries.
- [x] Implement shared skeleton families, route resolution, and visit lifecycle.
- [x] Implement the server boot fallback and document the future-page loading convention.
- [x] Add and run required frontend and integrated tests.
- [x] Run focused and project checks; record observed results below.

### Implementation contract

- React family keys: `landing`, `dashboard`, `list`, `detail`, `form`, `settings`, `auth`, and `generic`.
- Central Inertia tracking uses `before` and `start`/`finish` for non-prefetch GET visits, with a 200 ms delay and visit-id matching so stale finishes cannot clear newer visits. A GET visit that consumes a cached or in-flight prefetch is tracked by its actual visit ID and the source prefetch ID because it can bypass the normal request `start` event.
- Page boundary belongs inside the selected layout chain. Preserve app, nested settings, and auth shell navigation; the shell-less welcome page uses the same boundary directly.
- The server-rendered boot fallback maps `$page['component']` to the same family names. When Inertia SSR already filled `#app`, the sibling fallback stays hidden; otherwise it remains visible until React fills the mount root.
- Partial GET visits (search, filters, and pagination) count as page loading and use the destination family. Non-GET operations keep their existing local indicators.

### Architecture and QA mapping

- `app.tsx` already owns layout resolution and the global progress bar; `AppLayout` and `AuthLayout` are persistent shell boundaries, and `welcome` currently has no layout.
- The Inertia 3 router exposes visit URL, method, prefetch status, visit IDs, and cached request lookup. Normal requests use `start`/`finish`; visits consuming cached or in-flight prefetches can skip the actual visit's `start`, so `before` inspects the cache and terminal events clear either visit ID.
- `app.blade.php` renders through `<x-inertia::app />`; that component emits SSR HTML when available or an empty `#app` mount root otherwise. The boot fallback must not cover populated SSR markup.
- QA coverage will include family/path mapping, visit lifecycle with fake timers, server boot markup, accessible status, themes, responsive behavior, and reduced motion.

### Progress notes

- The Blade boot fallback, route-family resolver, shared skeletons, and visit provider are implemented. A read-only review found that prefetched GET navigations can skip Inertia's ordinary `start` event; the provider now detects those requests in `before`, and tests cover cached/in-flight prefetch consumption and terminal cleanup.
- `docs/design-system.md` now documents the route-family registration convention and preserves local operation indicators.
- The server route assertions require the project's in-memory SQLite test database. This environment lacks the PDO SQLite driver, so those two route tests cannot execute here; the database-free Blade family-map view test passes separately.

## Verification

- `npm.cmd run test:unit -- --run` — passed, 31 files and 193 tests.
- `npm.cmd run types:check` — passed.
- `npm.cmd run lint:check` — passed.
- `npm.cmd run format:check` — passed.
- `npm.cmd run build` — passed. Vite reports the existing Mapbox GL chunk is about 1.8 MB, above the 500 kB advisory threshold.
- `npm.cmd run test:e2e -- tests/e2e/page-loading.spec.ts` — passed on mobile, tablet, and desktop (6 tests); covers the server boot fallback before React mounts, shell-less landing navigation, the auth skeleton, dark theme, reduced motion, responsive overflow, and clearing after render.
- `php artisan test --filter=PageBootSkeletonViewTest` — passed, 1 test and 16 assertions across all seven named families and the generic fallback.
- `php artisan test --filter=PageBootSkeletonTest` — blocked: the local PHP runtime reports `could not find driver` for SQLite because PDO SQLite is unavailable.
- `php vendor/bin/pint --test tests/Feature/PageBootSkeletonTest.php tests/Feature/PageBootSkeletonViewTest.php` — passed.
- `php vendor/bin/phpstan analyse --no-progress` — passed with 0 errors.
- `composer ci:check` — frontend lint, formatting, types, 193 unit tests, and build passed; the script then stopped because its `pint` command was not resolvable from this Composer environment. Direct Pint passed as noted above. Composer's PHP feature-test stage was not reached.
- `composer audit --locked --no-interaction` and `npm.cmd audit --audit-level=high` — could not reach Packagist/npm registry due restricted network access.
- `git diff --check` — passed.

## Approved follow-up: Add consistent spacing to every page skeleton

### Goal

Give every page skeleton the existing responsive content spacing `p-4 sm:p-6 lg:p-8`, including every React family and the first-load server fallback, without changing real page layouts or applying the spacing around shell chrome.

### Implementation contract

- The shared React loading wrapper owns `p-4 sm:p-6 lg:p-8` so all current families and the generic fallback inherit it.
- Remove family-local spacing that would duplicate the shared padding, including the landing skeleton's own outer padding.
- Add `data-page-loading-content` to each family content region and apply the same responsive padding there. Preserve the app boot fallback's existing shell inset; the page content padding sits below its header, while shell chrome stays outside that region. Landing and auth boot fallbacks receive the shared padding directly on their content region.
- Verify computed padding at mobile, tablet, and desktop breakpoints for both in-app loading and the boot fallback.

### Progress

- [x] Save this approved follow-up before implementation.
- [x] Add shared spacing to React and Blade skeleton content regions.
- [x] Test family coverage, duplicate spacing, and responsive computed padding.
- [x] Record verification results.

### Verification

- `npm.cmd run test:unit -- --run tests/Frontend/page-loading.test.tsx` — passed, 76 tests; every family has the shared responsive padding classes.
- `php artisan test --filter=PageBootSkeletonViewTest` — passed, 1 test and 38 assertions; each named family and generic fallback has a padded content region after shell chrome where applicable.
- `npm.cmd run test:e2e -- tests/e2e/page-loading.spec.ts` — passed, 6 tests on mobile, tablet, and desktop. Computed top/right/bottom/left padding is 16px, 24px, and 32px for boot and in-app skeletons.
- `npm.cmd run types:check`, `npm.cmd run lint:check`, and `npm.cmd run format:check` — passed.
- `npm.cmd run build` — passed; Vite retains the existing Mapbox GL chunk size advisory.
- `php artisan view:cache`, `php vendor/bin/pint --test tests/Feature/PageBootSkeletonViewTest.php`, and `git diff --check` — passed. Compiled views were cleared after verification.
- A browser comparison against the protected dashboard page could not be completed because the local E2E login stayed on `/login`. Source inspection confirmed the dashboard and access page containers already use the same `p-4 sm:p-6 lg:p-8` classes applied to the skeleton wrapper.

## Approved follow-up: notification preview skeleton

### Goal

Give the persistent notification preview a skeleton list state during its refresh instead of showing only a text loading notice. Keep the notification header, controls, shell position, and existing retry state intact.

### Implementation contract

- Add a reusable notification-list skeleton that uses the shared `Skeleton` primitive and respects reduced motion.
- Show the skeleton only in place of notification list content while the preview refresh is in progress; keep the header, mark-as-read action, footer link, and error/retry message available.
- Give the skeleton an accessible loading status and cover pending, completion, empty-result, and failed-refresh states in frontend tests.

### Progress

- [x] Save this approved follow-up before implementation.
- [x] Implement the notification preview skeleton.
- [x] Run notification tests and frontend checks; record results.

### Verification

- `npm.cmd run test:unit -- --run tests/Frontend/notifications.test.tsx` â€” passed, 14 tests, including a pending refresh, successful result, empty result, and retry after failure.
- `npm.cmd run types:check` and `npm.cmd run lint:check` â€” passed.
- Prettier check for the notification components, notification tests, and this plan â€” passed.
- The first browser view still showed the text loader because `public/hot` was absent and `public/build` contained an older bundle. After `npm.cmd run build` passed, the rebuilt bundle contained `Loading notifications` and no longer contained `Refreshing notifications`.
- Opened `/notifications` in the local app after the rebuild. The notification preview exposed its loading status during the pending refresh, then settled into the empty state without the old text loader.
- `git diff --check` â€” passed.
- The build retains the existing Mapbox GL chunk-size advisory.
- The Impeccable detector reported the notification bell's existing `text-[10px]` unread badge as an advisory outside this loading-state change.
