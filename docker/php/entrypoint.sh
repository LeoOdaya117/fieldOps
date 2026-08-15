#!/usr/bin/env sh

set -eu

mkdir -p \
    storage/app/public \
    storage/framework/cache \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/testing \
    storage/framework/views \
    storage/logs \
    storage/inertia-devtools \
    bootstrap/cache

# Docker-managed runtime volumes avoid Windows bind-mount timestamp/permission
# issues when Apache (www-data) compiles Blade views and writes cached files.
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

if [ ! -f vendor/autoload.php ]; then
    composer install --no-interaction --prefer-dist --no-scripts
fi

# Regenerate Composer metadata inside the Linux container. This also prevents
# stale host-generated autoload files from breaking package discovery.
composer dump-autoload --no-interaction --no-scripts
php artisan package:discover --ansi
php artisan storage:link --force >/dev/null 2>&1 || true

exec "$@"
