# Project Context

Detected repository context, refreshed 2026-09-26 with `$project-init`. This is a point-in-time map, not an automatic repository monitor.

## Stack

- Composer constraints: PHP `^8.3`, Laravel `^13.17`, Inertia Laravel `^3.0`, Wayfinder `^0.1.14`.
- Frontend dependencies include React `^19.2.0`, TypeScript `^5.7.2`, Vite `^8.0.0`, and Tailwind CSS `^4.0.0`.
- These are manifest constraints, not resolved-version claims; consult lockfiles for exact installed versions.
- Laravel owns routes, authorization, validation, persistence, and page data; React owns presentation and local interaction state.
- Native Laragon on Windows is the primary workflow; Docker Compose is optional. CI config uses PHP 8.3 and Node 22.

## Request and application flow

- `bootstrap/app.php` registers `routes/web.php`, `routes/console.php`, health path `/up`, and web middleware including blocked-IP checks, appearance/system settings, idle-session enforcement, and Inertia request handling.
- `routes/web.php` defines public registration/invitation entry points and authenticated route groups for dashboard, notifications, media assets, access management, audit, IP blocks, visit logs, and system reference data.
- `routes/settings.php` defines profile, security, appearance, and protected system settings routes.
- Typical backend flow is route -> middleware -> Form Request -> controller -> action/model -> Inertia response, with Policy or authorization checks as applicable. See `docs/architecture.md`.
- `resources/js/app.tsx` bootstraps Inertia and selects shared app, auth, settings, and system-settings layouts; page entry points are in `resources/js/pages/`.

## Main areas

- `app/`: Laravel application code, including controllers, requests, actions, models, and policies.
- `routes/`: web and other route definitions.
- `resources/js/features/`: feature-level React and TypeScript behavior.
- `resources/js/pages/`: Inertia page entry points.
- `resources/css/theme.css`: semantic light and dark design tokens.
- `app/Actions/`, `app/Http/`, `app/Models/`, and `app/Policies/`: backend workflows, request handling, persistence, and authorization.
- `tests/Feature/`, `tests/Unit/`, `tests/Frontend/`, and `tests/e2e/`: PHPUnit feature/unit, Vitest frontend, and Playwright browser coverage.
- `vitest.config.ts` runs `tests/Frontend/**/*.test.{ts,tsx}` in jsdom; `playwright.config.ts` covers mobile, tablet, and desktop projects.
- `.agents/skills/`: project-local Codex workflows.
- `.codex/agents/`: project-scoped Codex agent definitions.

## Verified commands

See `AGENTS.md`, `composer.json`, `package.json`, and `.github/workflows/tests.yml` for canonical commands. CI audits Composer and npm dependencies and runs `composer ci:check`. Common checks include:

- `php artisan test --filter=FeatureName`
- `vendor\bin\pint --test`
- `vendor\bin\phpstan analyse`
- `npm run lint:check`, `npm run format:check`, `npm run types:check`
- `npm run test:unit -- --run`
- `npm run build`
- `composer ci:check` (frontend lint/format/type/unit checks and build, plus Laravel checks/tests)

Refresh this list from manifests and current project instructions when commands change.

## Verification status

This context was verified against `AGENTS.md`, `docs/architecture.md`, Composer/npm manifests, `bootstrap/app.php`, `routes/web.php`, `routes/settings.php`, `resources/js/app.tsx`, test configs, CI workflow, and the current directory layout. Package versions are reported as declared constraints. Re-run `$project-init` after significant architecture or tooling changes.
