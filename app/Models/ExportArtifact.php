<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property array<string, mixed> $filters
 * @property CarbonImmutable $expires_at
 */
class ExportArtifact extends Model
{
    use HasUuids;

    protected $fillable = [
        'owner_id', 'dataset', 'format', 'status', 'filters', 'disk', 'path', 'row_count', 'failure_message', 'expires_at',
    ];

    protected $hidden = ['disk', 'path', 'filters', 'failure_message'];

    protected function casts(): array
    {
        return [
            'filters' => 'array',
            'row_count' => 'integer',
            'expires_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
