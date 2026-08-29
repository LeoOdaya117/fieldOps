<?php

namespace App\Support\Security;

final class IpAddress
{
    public static function normalize(?string $ip): ?string
    {
        if ($ip === null || trim($ip) === '') {
            return null;
        }

        $packed = @inet_pton(trim($ip));

        if ($packed === false) {
            return null;
        }

        $normalized = inet_ntop($packed);

        return $normalized === false ? null : $normalized;
    }
}
