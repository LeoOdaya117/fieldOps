<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $user_id
 * @property string $event_type
 * @property string|null $outcome
 * @property string $ip_address
 * @property string|null $location_source
 * @property string|null $location_country_code
 * @property string|null $location_region
 * @property string|null $location_city
 * @property float|null $location_latitude
 * @property float|null $location_longitude
 * @property float|null $location_accuracy_meters
 * @property string|null $location_timezone
 * @property string|null $user_agent
 * @property string $method
 * @property string|null $route_name
 * @property string $path
 * @property int|null $status_code
 * @property CarbonImmutable $occurred_at
 * @property-read User|null $user
 */
class VisitLog extends Model
{
    public const array EVENT_TYPES = [
        'login',
        'logout',
    ];

    public const array OUTCOMES = [
        'success',
    ];

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'event_type',
        'outcome',
        'ip_address',
        'location_source',
        'location_country_code',
        'location_region',
        'location_city',
        'location_latitude',
        'location_longitude',
        'location_accuracy_meters',
        'location_timezone',
        'user_agent',
        'method',
        'route_name',
        'path',
        'status_code',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'status_code' => 'integer',
            'location_latitude' => 'float',
            'location_longitude' => 'float',
            'location_accuracy_meters' => 'float',
            'occurred_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
