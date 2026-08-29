<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * @property string $display_name
 * @property string|null $description
 * @property bool $is_system
 * @property string $status
 * @property int $record_status
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property-read int $users_count
 * @property-read User|null $createdBy
 * @property-read User|null $updatedBy
 */
class Role extends SpatieRole
{
    use HasRecordStatus;

    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'description',
        'is_system',
        'status',
        'record_status',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
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
