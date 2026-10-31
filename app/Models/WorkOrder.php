<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $reference
 * @property string $title
 * @property string|null $instructions
 * @property string $priority
 * @property CarbonImmutable $due_date
 * @property int|null $asset_id
 * @property string|null $asset_code_snapshot
 * @property string|null $asset_name_snapshot
 * @property string|null $location_label
 * @property float $latitude
 * @property float $longitude
 * @property string $status
 * @property int $version
 * @property int $record_status
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property-read CarbonImmutable $created_at
 * @property-read CarbonImmutable $updated_at
 * @property-read Asset|null $asset
 * @property-read User|null $createdBy
 * @property-read User|null $updatedBy
 */
class WorkOrder extends Model
{
    use HasRecordStatus;

    public const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

    public const STATUSES = ['open', 'cancelled'];

    protected $fillable = [
        'reference', 'title', 'instructions', 'priority', 'due_date', 'asset_id',
        'asset_code_snapshot', 'asset_name_snapshot', 'location_label', 'latitude', 'longitude', 'status', 'record_status', 'created_by', 'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'immutable_date',
            'latitude' => 'float',
            'longitude' => 'float',
            'asset_id' => 'integer',
            'record_status' => 'integer',
            'version' => 'integer',
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
    }

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class)->withTrashed();
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
}
