<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $ip_address
 * @property int|null $user_id
 * @property string|null $reason
 * @property bool $is_active
 * @property CarbonImmutable|null $blocked_at
 * @property int|null $blocked_by
 * @property CarbonImmutable|null $unblocked_at
 * @property int|null $unblocked_by
 * @property CarbonImmutable|null $first_seen_at
 * @property CarbonImmutable|null $last_seen_at
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property int $record_status
 * @property-read User|null $blockedBy
 * @property-read User|null $createdBy
 * @property-read User|null $user
 * @property-read User|null $unblockedBy
 * @property-read User|null $updatedBy
 */
class BlockedIpAddress extends Model
{
    use HasRecordStatus;

    protected $fillable = [
        'ip_address',
        'user_id',
        'reason',
        'is_active',
        'blocked_at',
        'blocked_by',
        'unblocked_at',
        'unblocked_by',
        'first_seen_at',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'is_active' => 'boolean',
            'blocked_at' => 'immutable_datetime',
            'unblocked_at' => 'immutable_datetime',
            'blocked_by' => 'integer',
            'unblocked_by' => 'integer',
            'first_seen_at' => 'immutable_datetime',
            'last_seen_at' => 'immutable_datetime',
            'record_status' => 'integer',
        ];
    }

    /**
     * @param  Builder<BlockedIpAddress>  $query
     * @return Builder<BlockedIpAddress>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /** @return BelongsTo<User, $this> */
    public function blockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'blocked_by')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function unblockedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'unblocked_by')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by')->withTrashed();
    }
}
