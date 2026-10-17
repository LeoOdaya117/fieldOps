# Session-scoped idle activity

Status: implemented; full verification remains incomplete because this environment lacks the SQLite PDO driver and denies writes to the configured Vite build output.

## Goal and success criteria

Prevent browser activity left behind by an earlier login or local project setup from immediately logging out a new login. Keep idle timeout enforcement and activity sharing between tabs that belong to the same authenticated session.

Success means:

- A fresh authenticated session starts with a fresh idle timer even when the browser has a stale `fieldops:last-activity` value from a previous setup on the same origin.
- Tabs in the same authenticated session continue to share activity and logout state.
- A logout or stale activity in a different authenticated session cannot log out or extend the timer of the current session.
- The server remains authoritative for the activity cookie and idle timeout; no session credential is exposed to browser storage or page props.

## Evidence and current behavior

- `resources/js/features/session/use-idle-session.ts` reads one origin-wide localStorage key when the authenticated hook mounts. A stale value older than `timeoutSeconds` causes the periodic check to post `/logout`.
- The same hook uses one origin-wide `BroadcastChannel` name. Its `logout` message redirects every listening tab to `/login`, regardless of which authenticated session sent it.
- `resources/js/components/platform-runtime.tsx` starts the hook in the authenticated app layout. The login form is outside this layout, so activity while completing login does not refresh the localStorage timestamp.
- `app/Http/Middleware/EnforceIdleSession.php` already binds its HttpOnly activity cookie to both user ID and a hash of the Laravel session ID, including when login succeeds. The client coordination is less scoped than this server-side check.
- `tests/Frontend/idle-session.test.tsx` clears localStorage in setup and therefore does not cover stale activity carried over from an earlier install or login.

This can recur after resetting/reinstalling the app if the browser keeps using the same origin, such as `http://localhost:8000`. Browser localStorage is independent of the Laravel database and is not cleared by a project setup/reset.

## Implementation approach

1. Establish a non-secret, random idle-activity scope in the Laravel session only after the request is authenticated. Store it under a dedicated session key and expose it as an authenticated-only shared Inertia prop through `app/Http/Middleware/HandleInertiaRequests.php`. Generate it with a cryptographically secure UUID; do not expose the Laravel session ID or derive a reusable authentication token from it.
2. Add the scope to the shared `Auth` TypeScript type and `resources/js/types/global.d.ts`. Pass it from `resources/js/components/platform-runtime.tsx` into `useIdleSession`.
3. Namespace the localStorage key and BroadcastChannel by the scope. Keep activity and logout coordination between tabs sharing the same session while isolating previous sessions and other sessions on the same origin.
4. Treat missing or malformed activity for a new scope as the current time. Retain the server heartbeat and HttpOnly session-bound cookie behavior. Ignore/remove the legacy global key; never use it to initialize a scoped session.
5. Keep idle timeout and logout behavior otherwise unchanged. Avoid changing `user-info.tsx`, authentication credentials, or login persistence semantics.

Likely code boundaries: `HandleInertiaRequests`, `resources/js/types/auth.ts`, `resources/js/types/global.d.ts`, `platform-runtime.tsx`, `use-idle-session.ts`, `tests/Feature/Auth`, and `tests/Frontend/idle-session.test.tsx`.

## Acceptance and regression scenarios

- Frontend: an old global activity timestamp does not cause logout after a new session scope mounts.
- Frontend: a stale scoped timestamp for the current session still triggers logout at the configured timeout.
- Frontend: activity in one tab refreshes the timer of another tab with the same scope.
- Frontend: activity and logout messages from a different scope have no effect.
- Frontend: no-scope/disabled guest state does not start a timer or access another session's storage key.
- Backend: authenticated Inertia props contain a stable non-empty random scope for repeated requests in one session; guest props do not expose one.
- Backend: independent authenticated sessions receive different scopes. The shared value is not the Laravel session ID and is not treated as authorization.
- Retain coverage for heartbeat success/failure, idle expiration, and existing server cookie/session binding.
- Verify relevant browser behavior in light/dark and narrow/desktop layouts only if the surrounding page UI changes; this plan does not propose a visual redesign.

## Assumptions and scope

- The idle timeout remains server-configurable through `system.idle_timeout_seconds`.
- Cross-tab coordination should apply to tabs sharing the same Laravel session cookie, which is the browser's current authenticated session for this app origin.
- Old global localStorage data is disposable and must not preserve an idle deadline across authentication sessions. It may be removed during migration but is never read for enforcement.
- This plan addresses idle-session client state only; it does not change cookie domain, session driver, account session-version invalidation, or project setup commands.

## Verification plan

- Add PHPUnit feature coverage for authenticated/guest scope sharing and per-session uniqueness.
- Add Vitest coverage for stale legacy timestamps, scoped timestamp expiration, same-scope activity synchronization, and cross-scope isolation.
- Run the focused auth feature and idle-session frontend tests, then the repository-required lint, format, type, unit, and build checks listed in `AGENTS.md` during implementation. Record only commands actually run.

## Progress and verification

- 2026-10-17: Added an authenticated random session scope to shared Inertia auth props and namespaced idle activity storage and BroadcastChannel messages with it. Added frontend coverage for stale legacy storage, same-session activity sync, cross-session isolation, and guest/no-scope behavior; added backend coverage for stable authenticated scope, scope renewal, and guest omission.
- Passed: `npm.cmd run test:unit -- --run --configLoader runner tests/Frontend/idle-session.test.tsx` (6 tests); `npm.cmd run types:check`; `npm.cmd run lint:check`; `npm.cmd run format:check`; `npm.cmd exec -- eslint tests/Frontend/idle-session.test.tsx resources/js/features/session/use-idle-session.ts resources/js/components/platform-runtime.tsx resources/js/types/auth.ts`; focused Prettier check; `vendor\bin\pint --test app/Http/Middleware/HandleInertiaRequests.php tests/Feature/Auth/IdleSessionTest.php`; `vendor\bin\phpstan analyse`; and `git diff --check`.
- Partial: Full frontend unit suite ran 37 files, with 266 tests passing and one unrelated timeout in `tests/Frontend/access.test.tsx` (`keeps role creation and editing on dedicated pages`; jsdom Mapbox canvas warning).
- Blocked: `php artisan test --filter=IdleSessionTest` could not initialize SQLite because this PHP runtime has no SQLite PDO driver. `npm.cmd run build -- --configLoader runner` transformed the app but could not clear `public/build/assets` due to filesystem permission denial. The standard Vite build also cannot write its temporary config under `node_modules/.vite-temp`.
- After fixing the lint findings in the new test mock, the full ESLint check passed. The focused idle-session suite was rerun after the final behavior edits and passed.
