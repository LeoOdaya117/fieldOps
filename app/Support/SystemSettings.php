<?php

namespace App\Support;

use App\Models\SystemSetting;
use App\Models\Timezone;
use DateTimeZone;
use Illuminate\Support\Facades\Schema;

final class SystemSettings
{
    public const NAME = 'name';

    public const TIMEZONE = 'timezone';

    public const PAGINATION_SIZE = 'pagination_size';

    /**
     * @return array<string, string>
     */
    public static function values(): array
    {
        $defaults = self::defaults();
        $stored = SystemSetting::query()
            ->whereIn('key', array_keys($defaults))
            ->pluck('value', 'key')
            ->all();

        return array_merge($defaults, array_filter($stored, static fn (mixed $value): bool => is_string($value)));
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

    /**
     * @return array<string, string>
     */
    private static function defaults(): array
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
