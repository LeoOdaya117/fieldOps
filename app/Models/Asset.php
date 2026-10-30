<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string $category
 * @property string $condition
 * @property float|null $latitude
 * @property float|null $longitude
 * @property int $record_status
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User|null $createdBy
 * @property-read User|null $updatedBy
 */
class Asset extends Model
{
    use HasRecordStatus;

    public const CONDITIONS = ['operational', 'needs_maintenance', 'out_of_service'];

    protected $fillable = [
        'code',
        'name',
        'category',
        'condition',
        'latitude',
        'longitude',
        'created_by',
        'updated_by',
        'record_status',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'record_status' => 'integer',
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by')->withTrashed();
    }

    /** @return HasMany<MediaAsset, $this> */
    public function evidence(): HasMany
    {
        return $this->hasMany(MediaAsset::class)->where('module', 'asset_evidence');
    }
}
