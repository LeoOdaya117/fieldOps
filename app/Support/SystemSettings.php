<?php

namespace App\Support;

use App\Models\SystemSetting;
use App\Models\Timezone;
use DateTimeZone;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

final class SystemSettings
{
    public const NAME = 'name';

    public const TIMEZONE = 'timezone';

    public const PAGINATION_SIZE = 'pagination_size';

    public const THEME = 'theme';

    public const IDLE_TIMEOUT_SECONDS = 'idle_timeout_seconds';

    public const LOGIN_MAX_ATTEMPTS = 'login_max_attempts';

    public const LOGIN_DECAY_MINUTES = 'login_decay_minutes';

    private const CACHE_KEY = 'system-settings.values.v2';

    /**
     * @return array<string, string>
     */
    public static function values(): array
    {
        $defaults = self::defaults();

        if (! Schema::hasTable('system_settings')) {
            return $defaults;
        }

        /** @var array<string, string> $stored */
        $stored = Cache::rememberForever(self::CACHE_KEY, static fn (): array => SystemSetting::query()
            ->whereIn('key', array_keys($defaults))
            ->pluck('value', 'key')
            ->map(static fn (mixed $value): string => (string) $value)
            ->all());

        return array_merge($defaults, $stored);
    }

    public static function name(): string
    {
        $name = trim(self::values()[self::NAME] ?? '');

        return $name !== '' ? $name : (string) config('system.defaults.name', 'FieldOps');
    }

    public static function timezone(): string
    {
        $timezone = self::values()[self::TIMEZONE] ?? 'UTC';

        return in_array($timezone, DateTimeZone::listIdentifiers(), true) ? $timezone : 'UTC';
    }

    /** @return list<string> */
    public static function timezoneOptions(): array
    {
        if (Schema::hasTable('timezones')) {
            $timezones = Timezone::query()
                ->orderBy('name')
                ->pluck('name')
                ->values()
                ->all();

            if ($timezones !== []) {
                return array_values(array_map(static fn (mixed $timezone): string => (string) $timezone, $timezones));
            }
        }

        return DateTimeZone::listIdentifiers();
    }

    public static function hasActiveTimezoneCatalog(): bool
    {
        return Schema::hasTable('timezones') && Timezone::query()->exists();
    }

    public static function paginationSize(): int
    {
        $value = (int) (self::values()[self::PAGINATION_SIZE] ?? 50);

        return in_array($value, self::paginationOptions(), true) ? $value : 50;
    }

    /**
     * @return list<int>
     */
    public static function paginationOptions(): array
    {
        return array_values(array_map('intval', config('system.pagination_options', [25, 50, 75, 100])));
    }

    public static function theme(): string
    {
        $theme = self::values()[self::THEME] ?? 'canvas';
        $theme = match ($theme) {
            'sidebar' => 'canvas',
            'header' => 'horizon',
            default => $theme,
        };

        return in_array($theme, self::themeOptions(), true) ? $theme : 'canvas';
    }

    /** @return list<string> */
    public static function themeOptions(): array
    {
        return array_map(
            static fn (array $definition): string => $definition['value'],
            self::themeDefinitions(),
        );
    }

    /**
     * @return list<array{value: string, label: string, description: string, traits: list<string>}>
     */
    public static function themeDefinitions(): array
    {
        $configuredThemes = config('system.themes', []);

        if (! is_array($configuredThemes)) {
            return [];
        }

        $definitions = [];

        foreach ($configuredThemes as $value => $definition) {
            if (! is_string($value) || ! is_array($definition)) {
                continue;
            }

            $label = $definition['label'] ?? null;
            $description = $definition['description'] ?? null;
            $configuredTraits = $definition['traits'] ?? null;

            if (! is_string($label) || ! is_string($description) || ! is_array($configuredTraits)) {
                continue;
            }

            $traits = [];

            foreach ($configuredTraits as $trait) {
                if (is_string($trait)) {
                    $traits[] = $trait;
                }
            }

            $definitions[] = [
                'value' => $value,
                'label' => $label,
                'description' => $description,
                'traits' => $traits,
            ];
        }

        return $definitions;
    }

    public static function idleTimeoutSeconds(): int
    {
        $value = (int) (self::values()[self::IDLE_TIMEOUT_SECONDS] ?? 900);

        return min(max($value, 60), self::maximumIdleTimeoutSeconds());
    }

    public static function maximumIdleTimeoutSeconds(): int
    {
        return max(60, (int) config('session.lifetime', 120) * 60);
    }

    public static function loginMaxAttempts(): int
    {
        return min(max((int) (self::values()[self::LOGIN_MAX_ATTEMPTS] ?? 5), 1), 20);
    }

    public static function loginDecayMinutes(): int
    {
        return min(max((int) (self::values()[self::LOGIN_DECAY_MINUTES] ?? 30), 1), 1440);
    }

    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @return array<string, string>
     */
    public static function defaults(): array
    {
        return array_map(
            static fn (mixed $value): string => (string) $value,
            config('system.defaults', [
                self::NAME => 'FieldOps',
                self::TIMEZONE => 'UTC',
                self::PAGINATION_SIZE => 50,
            ]),
        );
    }
}
