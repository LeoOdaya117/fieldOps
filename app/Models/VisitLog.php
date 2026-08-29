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
        'page_visit',
        'authentication',
        'logout',
        'blocked_request',
    ];

    public const array OUTCOMES = [
        'success',
        'failed',
        'blocked_ip',
        'blocked_account',
    ];

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'event_type',
        'outcome',
        'ip_address',
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
            'occurred_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}
