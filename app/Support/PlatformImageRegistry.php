<?php

namespace App\Support;

final class PlatformImageRegistry
{
    /**
     * @return array<string, array{label:string,purpose:string,recommended_aspect:string,fallback_url:string}>
     */
    public static function slots(): array
    {
        /** @var array<string, array{label:string,purpose:string,recommended_aspect:string,fallback_url:string}> $slots */
        $slots = config('platform-images.slots', []);

        return $slots;
    }

    public static function has(string $slot): bool
    {
        return array_key_exists($slot, self::slots());
    }
}
