<?php

namespace App\Actions\Security;

use App\Models\User;
use App\Models\VisitLog;
use App\Support\Security\IpAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class RecordVisitLog
{
    public function record(
        string $eventType,
        ?string $outcome,
        ?Request $request = null,
        ?User $user = null,
        ?int $statusCode = null,
    ): ?VisitLog {
        $request ??= app()->bound('request') ? request() : null;
        $ipAddress = IpAddress::normalize($request?->ip());

        if (
            $request === null
            || $ipAddress === null
            || ! in_array($eventType, VisitLog::EVENT_TYPES, true)
            || $outcome !== 'success'
        ) {
            return null;
        }

        $data = [
            'user_id' => $user?->getKey() ?? $request->user()?->getKey(),
            'event_type' => $eventType,
            'outcome' => $outcome,
            'ip_address' => $ipAddress,
            'user_agent' => $request->userAgent(),
            'method' => $request->method(),
            'route_name' => $request->route()?->getName(),
            'path' => $request->getPathInfo(),
            'status_code' => $statusCode,
            'occurred_at' => Carbon::now(),
        ];

        $browserLocation = $this->browserLocation($request);

        if ($browserLocation !== null) {
            $data = array_merge($data, $browserLocation);
        }

        return VisitLog::query()->create($data);
    }

    /** @return array<string, float|string|null>|null */
    private function browserLocation(Request $request): ?array
    {
        $latitude = $this->coordinate(
            $request->input('location_latitude') ?? $request->header('X-Browser-Location-Latitude'),
            -90,
            90,
        );
        $longitude = $this->coordinate(
            $request->input('location_longitude') ?? $request->header('X-Browser-Location-Longitude'),
            -180,
            180,
        );

        if ($latitude === null || $longitude === null) {
            return null;
        }

        $accuracy = $this->nonNegativeNumber(
            $request->input('location_accuracy_meters') ?? $request->header('X-Browser-Location-Accuracy'),
        );
        $timezone = $this->timezone(
            $request->input('location_timezone') ?? $request->header('X-Browser-Location-Timezone'),
        );

        return [
            'location_source' => 'browser',
            'location_latitude' => $latitude,
            'location_longitude' => $longitude,
            'location_accuracy_meters' => $accuracy,
            'location_timezone' => $timezone,
        ];
    }

    private function coordinate(mixed $value, float $minimum, float $maximum): ?float
    {
        if ((! is_int($value) && ! is_float($value) && ! is_string($value)) || ! is_numeric($value)) {
            return null;
        }

        $coordinate = (float) $value;

        return is_finite($coordinate) && $coordinate >= $minimum && $coordinate <= $maximum
            ? $coordinate
            : null;
    }

    private function nonNegativeNumber(mixed $value): ?float
    {
        if ((! is_int($value) && ! is_float($value) && ! is_string($value)) || ! is_numeric($value)) {
            return null;
        }

        $number = (float) $value;

        return is_finite($number) && $number >= 0 && $number <= 1_000_000
            ? $number
            : null;
    }

    private function timezone(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $timezone = trim($value);

        return $timezone !== '' && strlen($timezone) <= 64 ? $timezone : null;
    }
}
