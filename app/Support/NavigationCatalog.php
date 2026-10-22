<?php

namespace App\Support;

use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Route;
use Inertia\Controller as InertiaController;
use Inertia\Response as InertiaResponse;
use ReflectionMethod;
use ReflectionNamedType;
use ReflectionUnionType;
use Throwable;

class NavigationCatalog
{
    /**
     * Returns linkable, authenticated Inertia web pages for the role editor's route picker.
     *
     * @return list<array{name: string, path: string}>
     */
    public function routeOptions(): array
    {
        $router = app(Router::class);
        $options = [];

        foreach (Route::getRoutes()->getRoutes() as $route) {
            $name = $route->getName();

            if ($name === null || ! in_array('GET', $route->methods(), true)) {
                continue;
            }

            if ($name === 'system-settings.backups.status'
                || $this->hasRequiredParameters($route)
                || ! $this->isAuthenticatedWebRoute($route, $router)
                || ! $this->returnsInertiaPage($route)) {
                continue;
            }

            try {
                $options[] = [
                    'name' => $name,
                    'path' => route($name, [], false),
                ];
            } catch (Throwable) {
                // A named route may still need a domain parameter or otherwise fail URL generation.
            }
        }

        usort($options, static fn (array $left, array $right): int => strnatcasecmp($left['name'], $right['name']));

        return $options;
    }

    /**
     * @return list<array{key: string, title: string, group: string, href: string, permission: string|null, iconKey: string, superAdminOnly: bool}>
     */
    public function editorItems(): array
    {
        $items = [];

        foreach ($this->groups() as $group) {
            foreach ($group['items'] as $item) {
                $items[] = [
                    'key' => $item['key'],
                    'title' => $item['title'],
                    'group' => $group['label'],
                    'href' => route($item['route'], [], false),
                    'permission' => $item['permission'],
                    'iconKey' => $item['iconKey'],
                    'superAdminOnly' => (bool) ($item['superAdminOnly'] ?? false),
                ];
            }
        }

        return $items;
    }

    /** @return list<string> */
    public function keys(): array
    {
        return array_map(static fn (array $item): string => $item['key'], $this->editorItems());
    }

    /** @return list<string> */
    public function customIconKeys(): array
    {
        $catalogIcons = array_map(static fn (array $item): string => $item['iconKey'], $this->editorItems());
        $customIcons = config('navigation.custom_icon_keys', []);

        return array_values(array_unique([...$catalogIcons, ...$customIcons]));
    }

    private function hasRequiredParameters(RoutingRoute $route): bool
    {
        return preg_match('/\{[^}?]+\}/', $route->uri()) === 1;
    }

    private function isAuthenticatedWebRoute(RoutingRoute $route, Router $router): bool
    {
        $middleware = $route->gatherMiddleware();

        if (! in_array('web', $middleware, true)) {
            return false;
        }

        $authMiddleware = $router->getMiddleware()['auth'] ?? Authenticate::class;

        return collect($middleware)->contains(static fn (string $item): bool => $item === 'auth'
            || str_starts_with($item, 'auth:')
            || $item === $authMiddleware
            || str_starts_with($item, $authMiddleware.':'));
    }

    private function returnsInertiaPage(RoutingRoute $route): bool
    {
        $action = $route->getActionName();

        if ($action === InertiaController::class.'@__invoke') {
            return true;
        }

        [$controller, $method] = array_pad(explode('@', $action, 2), 2, '__invoke');

        if (! class_exists($controller) || ! method_exists($controller, $method)) {
            return false;
        }

        $returnType = (new ReflectionMethod($controller, $method))->getReturnType();

        if ($returnType === null) {
            return false;
        }

        $types = $returnType instanceof ReflectionUnionType ? $returnType->getTypes() : [$returnType];

        foreach ($types as $type) {
            if ($type instanceof ReflectionNamedType
                && ! $type->isBuiltin()
                && is_a($type->getName(), InertiaResponse::class, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns the saved selection order, preserving keys hidden by current permissions.
     * A null selection resolves to the former permission-derived menu in catalog order.
     *
     * @return list<string>
     */
    public function selectedKeysForRole(Role $role): array
    {
        if ($role->navigation_items !== null) {
            $customKeys = array_map(
                static fn (array $item): string => $item['key'],
                $role->custom_navigation_items ?? [],
            );

            return array_values(array_intersect($role->navigation_items, [...$this->keys(), ...$customKeys]));
        }

        $permissions = $role->permissions()->pluck('name')->all();
        $isSuperAdminRole = $role->name === 'super_admin';

        return array_values(array_map(
            static fn (array $item): string => $item['key'],
            array_filter($this->editorItems(), static fn (array $item): bool => ($item['permission'] === null || in_array($item['permission'], $permissions, true))
                && (! $item['superAdminOnly'] || $isSuperAdminRole)),
        ));
    }

    /**
     * @return list<array{label: string, items: list<array{key: string, title: string, href: string, iconKey: string}>}>
     */
    public function forUser(?User $user): array
    {
        if ($user === null || ! $user->isActive()) {
            return [];
        }

        $user->loadMissing('roles');
        $role = $user->roles->first();

        if ($role === null) {
            return [];
        }

        // Legacy null selections retain the catalog's original order. Explicit selections
        // are an ordered list and must remain in that order after access checks.
        $selected = $role->navigation_items ?? $this->keys();
        $isSuperAdmin = $user->isSuperAdmin();
        $groupOverrides = $role->navigation_group_overrides ?? [];
        $itemsByKey = [];

        foreach ($this->groups() as $group) {
            foreach ($group['items'] as $item) {
                $itemsByKey[$item['key']] = [...$item, 'group' => $groupOverrides[$item['key']] ?? $group['label']];
            }
        }

        $customItemsByKey = [];

        foreach ($role->custom_navigation_items ?? [] as $item) {
            $customItemsByKey[$item['key']] = $item;
        }

        $navigation = [];

        foreach ($selected as $key) {
            if (isset($itemsByKey[$key])) {
                $item = $itemsByKey[$key];

                if ($item['permission'] !== null && ! $user->can($item['permission'])) {
                    continue;
                }

                if (($item['superAdminOnly'] ?? false) && ! $isSuperAdmin) {
                    continue;
                }

                $href = route($item['route']);
            } elseif (isset($customItemsByKey[$key])) {
                $item = $customItemsByKey[$key];
                $href = $item['url'];
            } else {
                continue;
            }

            $groupIndex = array_key_last($navigation);

            if ($groupIndex === null || $navigation[$groupIndex]['label'] !== $item['group']) {
                $navigation[] = ['label' => $item['group'], 'items' => []];
                $groupIndex = array_key_last($navigation);
            }

            $navigation[$groupIndex]['items'][] = [
                'key' => $item['key'],
                'title' => $item['title'],
                'href' => $href,
                'iconKey' => $item['iconKey'],
            ];
        }

        return $navigation;
    }

    /**
     * @return list<array{
     *     label: string,
     *     items: list<array{
     *         key: string,
     *         title: string,
     *         route: string,
     *         permission: string|null,
     *         iconKey: string,
     *         superAdminOnly?: bool
     *     }>
     * }>
     */
    private function groups(): array
    {
        /** @var list<array{
         *     label: string,
         *     items: list<array{
         *         key: string,
         *         title: string,
         *         route: string,
         *         permission: string|null,
         *         iconKey: string,
         *         superAdminOnly?: bool
         *     }>
         * }> $groups
         */
        $groups = config('navigation.groups', []);

        return $groups;
    }
}
