<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $name
 * @property int $record_status
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read User|null $createdBy
 * @property-read User|null $updatedBy
 */
class Timezone extends Model
{
    use HasRecordStatus;

    protected $fillable = [
        'name',
        'record_status',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
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
}
