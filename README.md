# FieldOps

FieldOps is a Laravel 13 application for coordinating field operations and the teams that perform them. It uses a Laravel backend with Inertia.js, React, TypeScript, Vite, and Tailwind CSS.

The project supports native Windows development with Laragon. Docker Compose is also available as an optional containerized runtime.

## Technology stack

- Laravel 13 and PHP 8.3+
- Apache HTTP Server or Laravel's built-in development server
- React 19 with TypeScript
- Inertia.js for the Laravel-to-React application bridge
- Vite 8 for frontend development and asset bundling
- Tailwind CSS 4
- MySQL 8.4 or MariaDB
- Laragon for native Windows development
- Docker Compose as an optional containerized runtime
- Mailpit or application log output for local email testing
- PHPUnit, Pint, PHPStan, ESLint, Prettier, Vitest, Testing Library, and Playwright

## Setup guides

- [Laragon / native Windows setup](docs/laragon.md) — recommended when developing locally on Windows
- [Testing and quality checks](docs/testing.md)
- [Architecture](docs/architecture.md)
- [Design system](docs/design-system.md)
- [AGENTS.md](AGENTS.md) — canonical engineering conventions

## Native Laragon setup

For the complete step-by-step setup, see [docs/laragon.md](docs/laragon.md).

The short version is:

```powershell
Set-Location C:\laragon\www\fieldOps
Copy-Item .env.example .env
composer install
npm ci
php artisan key:generate
php artisan storage:link
php artisan migrate
npm run dev
```

Start Apache and MySQL with Laragon, then open [http://fieldops.test](http://fieldops.test). The Apache document root must be the project's `public` directory.

If you use Laravel's built-in server instead of Laragon Apache, run this in another terminal and open [http://localhost:8000](http://localhost:8000):

```powershell
php artisan serve --host=127.0.0.1 --port=8000
```

Keep `npm run dev` running while developing so Vite can provide hot-reloaded assets on port `5173`.

## Optional Docker setup

Docker is not required for local development. To use the containerized runtime, install Docker Desktop with Linux containers enabled, then run:

```powershell
Set-Location D:\Github\fieldOps
Copy-Item .env.example .env
docker compose up -d --build
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
docker compose ps
```

The Compose app service overrides the native database host and credentials with Docker-specific defaults, so the same `.env.example` can be used for either runtime. The Docker database defaults are:

```text
Database: fieldops
Username: fieldops
Password: password
Root password: root
```

Open:

- [http://localhost:8000](http://localhost:8000) — Laravel and React application
- [http://localhost:5173](http://localhost:5173) — Vite development server
- [http://localhost:8025](http://localhost:8025) — Mailpit dashboard

Inside Docker, the application connects to MySQL using `DB_HOST=mysql`. Native Laragon uses `DB_HOST=127.0.0.1`.

## Daily development commands

### Native Laragon

```powershell
Set-Location C:\laragon\www\fieldOps
php artisan migrate
php artisan route:list
php artisan make:model Task -m
php artisan test
npm run lint:check
npm run format:check
npm run types:check
npm run test:unit -- --run
npm run build
```

Run `npm run dev` in a separate terminal during frontend development.

### Docker

Start and stop the environment:

```powershell
docker compose up -d
docker compose down
docker compose ps
```

Follow service logs:

```powershell
docker compose logs -f app
docker compose logs -f node
```

Run Laravel commands:

```powershell
docker compose exec app php artisan migrate
docker compose exec app php artisan make:model Task -m
docker compose exec app php artisan route:list
```

Run frontend commands:

```powershell
docker compose exec node npm install
docker compose exec node npm run build
docker compose exec node npm run lint:check
docker compose exec node npm run types:check
docker compose exec node npm run test:unit -- --run
```

## Testing and code quality

From a native Laragon terminal:

```powershell
php artisan test
vendor\bin\pint --test
vendor\bin\phpstan analyse
npm run lint:check
npm run format:check
npm run types:check
npm run test:unit -- --run
npm run build
```

The complete local gate can also be run through Composer:

```powershell
composer ci:check
composer audit --locked --no-interaction
npm audit --audit-level=high
```

For critical browser flows, build the production assets first, then run Playwright with the appropriate local base URL:

```powershell
Remove-Item -Force public\hot -ErrorAction SilentlyContinue
npm run build
$env:E2E_BASE_URL = 'http://fieldops.test'
npm run test:e2e
```

Docker contributors can run the same checks inside the `app` and `node` services. See [docs/testing.md](docs/testing.md).

## Data and generated files

Native Laragon stores MySQL data in Laragon's configured data directory. Docker stores MySQL data in the `mysql_data` volume. In either workflow, `.env`, `vendor`, `node_modules`, build output, and generated Wayfinder files are ignored and must not be committed.

Do not run this Docker command unless you intentionally want to delete the Docker database:

```powershell
docker compose down -v
```

## Troubleshooting

If `fieldops.test` does not open, reload Apache in Laragon, confirm Auto Virtual Hosts is enabled, and make sure the virtual host points to `fieldOps\public`.

If the page has no styles or reports a missing Vite manifest, install frontend dependencies and start Vite:

```powershell
npm ci
npm run dev
```

If MySQL reports an access error, verify the `DB_*` values in `.env` match the active runtime. Use `127.0.0.1` for Laragon and `mysql` for Docker.
