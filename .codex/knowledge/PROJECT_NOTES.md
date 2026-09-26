# Verified Project Notes

Use this file for durable conventions confirmed from source or canonical project guidance. `$project-init` and `$feature-build` should preserve existing notes and amend only facts that have become stale.

- `AGENTS.md` is the canonical engineering guide for this repository.
- Laravel owns routing, authentication, authorization, validation, persistence, and Inertia page data; React owns presentation and local interaction state.
- Keep controllers thin; use Form Requests for input validation and request authorization, Policies for resource authorization, and Actions for reusable or multi-step operations.
- Frontend code uses strict TypeScript, Inertia state, Wayfinder-generated routes, shared UI primitives, semantic theme tokens, and responsive light/dark behavior.
- The repository's test guidance requires success, authorization, validation/failure, side-effect, and relevant UI theme/responsive coverage.
- The documented backend request flow is route -> middleware -> Form Request -> controller -> action/model -> Inertia response; policies or other authorization checks guard resource access (`docs/architecture.md`).
- `bootstrap/app.php` registers `routes/web.php` and `routes/console.php`, the `/up` health path, and project web middleware; `routes/web.php` includes authenticated access-management and system-data groups while `routes/settings.php` defines profile and settings flows.
- `resources/js/app.tsx` bootstraps Inertia and selects shared layouts; route entry pages live in `resources/js/pages/`, with reusable feature behavior under `resources/js/features/`.
- Frontend tests use Vitest with jsdom and `tests/Frontend/`; browser tests use Playwright with mobile, tablet, and desktop projects. PHPUnit covers Laravel feature and unit tests.
- `composer ci:check` coordinates frontend lint, format, type, unit checks and build with Laravel checks; CI additionally runs dependency audits (`.github/workflows/tests.yml`).

Add new notes only with a source or instruction path that supports them. Do not store credentials, `.env` values, or sensitive data here. Refreshed 2026-09-26 from current manifests, route/bootstrap files, architecture documentation, test configuration, and CI workflow.
