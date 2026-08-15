# FieldOps

FieldOps is a web application for coordinating field operations and the teams that perform them. It provides a Laravel backend with a React frontend and is designed to grow into workflows such as field tasks, assignments, users, and operational tracking.

The project runs entirely through Docker for local development. Laravel Sail is not used.

## Technology stack

- Laravel 13 and PHP 8.4
- Apache HTTP Server
- React 19 with TypeScript
- Inertia.js for the Laravel-to-React application bridge
- Vite 8 for frontend development and asset bundling
- Tailwind CSS 4
- MySQL 8.4
- Docker Compose
- Mailpit for local email testing
- PHPUnit, Pint, PHPStan, ESLint, and Prettier for testing and code quality

## Requirements

On Windows 11, install:

- Docker Desktop with Linux containers enabled
- PowerShell
- Git, if you plan to clone or version the project

PHP, Composer, Node.js, npm, and MySQL do not need to be installed directly on Windows. They run inside Docker.

## Project setup

Open PowerShell and go to the project folder:

```powershell
cd "G:\Projects\Web Dev\Laravel\fieldOps"
```

If this is a new copy of the project, create the environment file:

```powershell
Copy-Item .env.example .env
```

Start and build the Docker environment:

```powershell
docker compose up -d --build
```

Generate the Laravel application key if the `.env` file does not already contain one:

```powershell
docker compose exec app php artisan key:generate
```

Create the database tables:

```powershell
docker compose exec app php artisan migrate
```

The application container automatically installs Composer dependencies and the Node container automatically installs npm dependencies when needed.

## Open the application

- Laravel and React application: [http://localhost:8000](http://localhost:8000)
- Vite development server: [http://localhost:5173](http://localhost:5173)
- Mailpit email dashboard: [http://localhost:8025](http://localhost:8025)

Use `localhost` exactly for the application URL. The Vite configuration allows the Laravel page at `http://localhost:8000` to load frontend assets from `http://localhost:5173`.

## Docker services

| Service | Purpose | Local address |
| --- | --- | --- |
| `app` | PHP, Apache, Laravel, and Composer | `http://localhost:8000` |
| `node` | React and Vite development server | `http://localhost:5173` |
| `mysql` | Application database | `localhost:3306` |
| `mailpit` | Local email capture and dashboard | `http://localhost:8025` |

Inside Docker, Laravel must connect to MySQL using the service name `mysql`, not `localhost`:

```env
DB_HOST=mysql
```

## Daily development commands

Start the environment:

```powershell
docker compose up -d
```

Stop the containers while keeping the database:

```powershell
docker compose down
```

View the running services:

```powershell
docker compose ps
```

Follow Laravel logs:

```powershell
docker compose logs -f app
```

Follow Vite logs:

```powershell
docker compose logs -f node
```

Run Laravel Artisan commands inside Docker:

```powershell
docker compose exec app php artisan migrate
docker compose exec app php artisan make:model Task -m
docker compose exec app php artisan route:list
```

Run frontend commands inside Docker:

```powershell
docker compose exec node npm install
docker compose exec node npm run build
docker compose exec node npm run lint:check
docker compose exec node npm run types:check
```

## Testing and code quality

```powershell
docker compose exec app php artisan test
docker compose exec app ./vendor/bin/pint --test
docker compose exec app ./vendor/bin/phpstan analyse
docker compose exec node npm run lint:check
docker compose exec node npm run format:check
docker compose exec node npm run types:check
```

## Data and Docker volumes

Docker manages the MySQL database in the `mysql_data` volume. Laravel's writable storage and cache directories also use Docker volumes because Windows bind mounts can cause PHP permission and timestamp errors.

This command stops the services but keeps the database:

```powershell
docker compose down
```

Do not run the following unless you intentionally want to delete the database and other Docker-managed data:

```powershell
docker compose down -v
```

## Troubleshooting

Check that all services are running and MySQL is healthy:

```powershell
docker compose ps
```

If the page is blank after a frontend change, restart Vite and hard-refresh the browser:

```powershell
docker compose restart node
```

Then open `http://localhost:8000` and press `Ctrl + Shift + R`.

If Laravel reports a database connection error, confirm that `.env` uses Docker service names:

```env
DB_HOST=mysql
DB_PORT=3306
```

When dependencies or Docker configuration change, rebuild the affected services:

```powershell
docker compose up -d --build
```

