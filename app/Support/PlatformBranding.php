<?php

namespace App\Support;

use App\Models\PlatformImageAssignment;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

final class PlatformBranding
{
    private const CACHE_KEY = 'platform-branding.values.v1';

    /**
     * @return array<string, array{url:string,version:int,is_custom:bool}>
     */
    public static function values(): array
    {
        /** @var array<string, array{url:string,version:int,is_custom:bool}> $branding */
        $branding = Cache::rememberForever(self::CACHE_KEY, static function (): array {
            $assignments = Schema::hasTable('platform_image_assignments')
                ? PlatformImageAssignment::query()->with('asset')->get()->keyBy('slot')
                : collect();
            $result = [];

            foreach (PlatformImageRegistry::slots() as $slot => $definition) {
                $assignment = $assignments->get($slot);
                $isCustom = $assignment?->asset !== null;
                $version = $isCustom ? (int) $assignment->version : 0;
                $result[$slot] = [
                    'url' => $isCustom
                        ? route('platform-assets.show', ['slot' => $slot, 'v' => $version], false)
                        : $definition['fallback_url'],
                    'version' => $version,
                    'is_custom' => $isCustom,
                ];
            }

            return $result;
        });

        return $branding;
    }

    public static function url(string $slot): string
    {
        return self::values()[$slot]['url']
            ?? PlatformImageRegistry::slots()[$slot]['fallback_url']
            ?? '/favicon.svg';
    }

    public static function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
