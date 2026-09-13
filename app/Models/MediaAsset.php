<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MediaAsset extends Model
{
    use HasRecordStatus;

    protected $fillable = [
        'uploader_id', 'disk', 'path', 'thumbnail_path', 'original_name',
        'mime_type', 'extension', 'size_bytes', 'width', 'height', 'source',
        'created_by', 'updated_by', 'record_status',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'record_status' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id')->withTrashed();
    }

    /** @return HasMany<PlatformImageAssignment, $this> */
    public function platformAssignments(): HasMany
    {
        return $this->hasMany(PlatformImageAssignment::class);
    }

    public function isAssigned(): bool
    {
        return $this->platformAssignments()->exists();
    }
}
