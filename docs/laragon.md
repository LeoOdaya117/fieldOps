# Laragon local development

FieldOps can run natively on Windows with Laragon. Docker is optional; it is not required for application development.

This guide uses Laragon's Apache and MySQL services, PHP 8.3+, Composer, and Node.js/npm.

## 1. Install the prerequisites

Install or enable the following:

- Laragon with Apache and MySQL (MariaDB also works with the same Laravel configuration).
- PHP 8.3 or newer. Laragon's PHP version must satisfy the `^8.3` requirement in `composer.json`.
- PHP extensions `pdo_mysql`, `pdo_sqlite`, `sqlite3`, `mbstring`, `openssl`, `fileinfo`, `intl`, `gd`, `bcmath`, and `zip`.
- Composer.
- Node.js and npm. Laragon can manage Node.js versions, or Node.js can be installed separately.
- Git.

Keep the native Laragon checkout on the Windows filesystem, preferably under Laragon's document root:

```text
C:\laragon\www\fieldOps
```

If the project currently exists only inside WSL, clone the same Git remote into `C:\laragon\www\fieldOps` for the native workflow. Avoid using a `\\wsl.localhost\...` path as the Apache document root; keep the WSL checkout for WSL-based development.

Laragon's default document root is `C:\laragon\www`, and its Auto Virtual Hosts feature creates a URL based on the project folder name. That makes this project available at `http://fieldops.test` after Apache is reloaded.

## 2. Clone or open the project

Using PowerShell:

```powershell
Set-Location C:\laragon\www
git clone <your-fieldops-repository-url> fieldOps
Set-Location C:\laragon\www\fieldOps
```

If the project is already cloned there, only change into the directory:

```powershell
Set-Location C:\laragon\www\fieldOps
```

## 3. Start Laragon services

Open Laragon and click **Start All**. Confirm that Apache and MySQL are running.

If Auto Virtual Hosts is enabled, click **Reload** after adding the project. If `http://fieldops.test` does not resolve, configure the Apache virtual host's document root as:

```text
C:\laragon\www\fieldOps\public
```

The web root must be the Laravel `public` directory, not the repository root.

## 4. Create the local database

Use Laragon's database client, such as HeidiSQL, to create a database named `fieldops`.

The default `.env.example` assumes:

```text
Host: 127.0.0.1
Port: 3306
Database: fieldops
Username: root
Password: empty
```

If your Laragon MySQL credentials differ, use your local values in `.env`.

## 5. Install PHP and frontend dependencies

From `C:\laragon\www\fieldOps`:

```powershell
Copy-Item .env.example .env
composer install
npm ci
```

Do not commit `.env`, `vendor`, or `node_modules`.

## 6. Configure `.env`

Set the application URL and local database values:

```env
APP_URL=http://fieldops.test

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fieldops
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=file
CACHE_STORE=file
QUEUE_CONNECTION=sync
MAIL_MAILER=log
```

If you use `php artisan serve` instead of Laragon Apache, set `APP_URL=http://localhost:8000` and use that URL in the browser.

## 7. Initialize Laravel

Run these commands once for a new checkout:

```powershell
php artisan key:generate
php artisan storage:link
php artisan migrate
php artisan optimize:clear
```

If you intentionally need a fresh local database, use `php artisan migrate:fresh --seed`. This deletes existing local data.

## 8. Start the frontend development server

Keep Laragon's Apache and MySQL running. In a separate terminal, run:

```powershell
Set-Location C:\laragon\www\fieldOps
npm run dev
```

Leave this terminal open while developing. Vite serves hot-reloaded assets on port `5173`.

Open:

- Application: <http://fieldops.test>
- Vite dev server: <http://localhost:5173>

Do not run `php artisan serve` at the same time when using the Laragon Apache URL. If you prefer Laravel's built-in server, stop using the Apache URL and run both processes manually:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
npm run dev
```

Then open <http://localhost:8000>.

## Daily workflow

Start Laragon, then run the Vite process:

```powershell
Set-Location C:\laragon\www\fieldOps
npm run dev
```

Useful commands:

```powershell
php artisan migrate
php artisan route:list
php artisan make:model Task -m
php artisan test
npm run lint:check
npm run types:check
npm run test:unit -- --run
npm run build
```

## Troubleshooting

### `fieldops.test` does not open

Reload Laragon's Apache service and confirm Auto Virtual Hosts is enabled. Confirm the virtual host points to `fieldOps\public`.

### `Vite manifest not found` or the page has no styles

Run `npm ci` if dependencies are missing, then start `npm run dev`. For a static production-style asset check, run `npm run build` and refresh the browser.

### MySQL access denied

Confirm that MySQL is running in Laragon and that `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `.env` match the Laragon database.

### PHPUnit reports `could not find driver` for SQLite

Open Laragon's PHP `php.ini` from **Menu > PHP > php.ini**, enable `pdo_sqlite` and `sqlite3`, then restart Laragon. PHPUnit uses an in-memory SQLite database even when the application itself uses MySQL.

### Port 80 or 3306 is already in use

Stop the conflicting service in Laragon or Windows. Alternatively, use `php artisan serve --port=8000` for the web server and update `APP_URL` accordingly.

## Optional Docker workflow

Docker remains available for contributors who want a containerized environment. See the Docker section in the project [README](../README.md). The native Laragon workflow above does not require Docker.
