<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int|null $actor_user_id
 * @property string $event
 * @property string|null $subject_type
 * @property string|null $subject_id
 * @property array<string, mixed>|null $before
 * @property array<string, mixed>|null $after
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property CarbonImmutable $occurred_at
 * @property-read User|null $actor
 */
class AccessAuditEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'actor_user_id',
        'event',
        'subject_type',
        'subject_id',
        'before',
        'after',
        'ip_address',
        'user_agent',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'occurred_at' => 'immutable_datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(static function (): void {
            throw new \LogicException('Access audit events are immutable.');
        });

        static::deleting(static function (): void {
            throw new \LogicException('Access audit events cannot be deleted.');
        });
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id')->withTrashed();
    }

    /**
     * @param  Builder<AccessAuditEvent>  $query
     * @return Builder<AccessAuditEvent>
     */
    public function scopeForSubject(Builder $query, Model $subject): Builder
    {
        return $query
            ->where('subject_type', $subject->getMorphClass())
            ->where('subject_id', (string) $subject->getKey());
    }
}
