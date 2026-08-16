# FieldOps Engineering Guide

This file is the canonical project guide for Codex, Cursor, Claude Code, GitHub Copilot, and human contributors. Read it before changing application code. Tool-specific instruction files should reference this file instead of duplicating it.

## Project shape

FieldOps is a Laravel 13 application using PHP 8.3+, Inertia.js, React 19, TypeScript, Vite, and Tailwind CSS. Docker Compose is the supported local runtime. Laravel owns routing, authentication, authorization, validation, persistence, and server-side page data. React owns presentation and local interaction state.

Use this feature-oriented structure for new work:

```text
app/
  Actions/<Feature>/              # Reusable or multi-step business operations
  Http/Controllers/<Feature>/     # Thin request orchestration
  Http/Requests/<Feature>/         # Validation and authorization
  Models/                          # Eloquent persistence models
  Policies/                        # Resource authorization
resources/js/
  features/<feature>/
    components/
    hooks/
    types/
  pages/                           # Inertia route entry points
  components/ui/                   # Shared design-system primitives
  components/                      # Shared application components
  layouts/
  hooks/
  lib/
  types/
tests/
  Feature/<Feature>/
  Unit/<Feature>/
  Frontend/
  e2e/
```

Do not add repositories, generic services, or a separate domain layer by default. Add an abstraction only when it removes real duplication or isolates a meaningful business rule.

## Backend conventions

- Keep routes declarative and named. Do not put business logic in route closures.
- Keep controllers thin: authorize, call the appropriate action/model operation, return an Inertia response or redirect.
- Put input validation and request-level authorization in Form Requests.
- Use Policies for resource-level authorization and test authorization independently from authentication.
- Use Actions for reusable, multi-step, transactional, or externally integrated operations.
- Use Eloquent relationships, scopes, casts, factories, and database constraints for persistence behavior.
- Use transactions for multi-record writes and make operations idempotent where retries are possible.
- Use `validated()` data only. Do not mass-assign untrusted request input.
- Keep sensitive fields hidden and never expose secrets, password hashes, recovery codes, or raw credentials through Inertia props or logs.
- Apply `auth`, `verified`, password-confirmation, and throttle middleware explicitly where the feature requires them.
- Validate file uploads by MIME type, size, storage disk, and generated filename. Never trust a user-provided path.
- Prefer immutable dates and typed return values. Run Pint and PHPStan before committing.

## Frontend conventions

- Use TypeScript strict mode. Avoid `any`; use a narrow type or `unknown` with validation.
- Use Inertia forms and Wayfinder-generated routes for server mutations and navigation.
- Treat server data as Inertia state. Keep client state local and minimal.
- Keep page entry points small; move reusable feature behavior into `resources/js/features/<feature>`.
- Use shared primitives from `components/ui` and semantic design tokens from `resources/css/theme.css`.
- Use semantic HTML, visible focus states, labels, keyboard support, and meaningful empty/loading/error states.
- Build mobile-first. Test narrow mobile, tablet, and desktop layouts. Avoid fixed-width content and unbounded horizontal scrolling.
- Every component and page must render correctly in both light and dark themes. Use semantic tokens instead of hard-coded colors or isolated dark-mode patches.
- Respect reduced-motion preferences and do not make color the only signal for status.
- Use named exports for shared utilities and components unless a framework convention requires a default export.

## Design system

All application colors are defined in `resources/css/theme.css`. Edit that file when changing the palette. Components should use roles such as `bg-background`, `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`, `text-success`, and `bg-brand` rather than raw hex, RGB, or neutral colors.

Every token has a light and dark value. New tokens must have sufficient contrast in both modes and must be mapped through Tailwind's semantic `@theme` variables when they are used by utility classes.

## Test-first feature rule

Every feature, page, endpoint, action, hook, and non-trivial component must include tests in the same change. The minimum test matrix is:

1. Successful behavior.
2. Authentication and authorization failures where applicable.
3. Validation and edge/failure paths.
4. Important side effects, persistence, or emitted UI states.
5. Light/dark and responsive behavior for user-facing UI.

Use PHPUnit for Laravel behavior, Vitest + Testing Library for React behavior, and Playwright for critical browser flows. Do not use snapshots as the only assertion. Update tests when behavior changes.

## Security and reliability checklist

Before opening a pull request, verify:

- Authorization is enforced server-side and is covered by a negative test.
- Input is validated, bounded, normalized where appropriate, and never trusted from the client.
- State-changing requests use the authenticated web session and CSRF protection.
- Sensitive operations are throttled or require password confirmation where appropriate.
- Database writes preserve invariants with constraints and transactions.
- Errors shown to users are safe and actionable; internal details stay in protected logs.
- Dependencies pass Composer and npm audits.
- New routes, props, uploads, queues, notifications, and external calls have failure-path tests.

## Required commands

Run these through Docker when possible:

```powershell
docker compose up -d
docker compose exec app composer ci:check
docker compose exec app composer audit --locked --no-interaction
docker compose exec node npm run test:unit
docker compose exec node sh -lc "rm -f public/hot && npm run build && E2E_BASE_URL=http://fieldops.test npm run test:e2e"
```

Useful focused commands:

```powershell
docker compose exec app php artisan test --filter=FeatureName
docker compose exec app ./vendor/bin/pint --test
docker compose exec app ./vendor/bin/phpstan analyse
docker compose exec node npm run lint:check
docker compose exec node npm run format:check
docker compose exec node npm run types:check
docker compose exec node npm run test:unit -- --run
docker compose exec node npm run test:unit:coverage
docker compose exec node npm audit --audit-level=high
npx playwright test
```

Do not commit generated Wayfinder files, build output, `.env` files, dependency directories, or secrets. Keep migrations, tests, and documentation with the feature that needs them.

## Delivery checklist

- [ ] Architecture follows the backend/frontend conventions above.
- [ ] Tests cover success, security, validation, and failure behavior.
- [ ] Light/dark theme and mobile/tablet/desktop states are verified.
- [ ] No new raw application colors were introduced outside `resources/css/theme.css`.
- [ ] Formatting, linting, type checks, static analysis, tests, and build pass.
- [ ] Documentation and Inertia prop/route contracts are updated when needed.
