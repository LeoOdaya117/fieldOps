<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use LogicException;

class MediaAsset extends Model
{
    use HasRecordStatus;

    protected $fillable = [
        'uploader_id', 'disk', 'path', 'thumbnail_path', 'original_name', 'module', 'tag',
        'mime_type', 'extension', 'size_bytes', 'width', 'height', 'source',
        'created_by', 'updated_by', 'record_status',
    ];

    protected $hidden = ['id', 'disk', 'path', 'thumbnail_path', 'uploader_id', 'created_by', 'updated_by'];

    protected static function booted(): void
    {
        static::creating(static function (self $asset): void {
            $asset->token ??= Str::random(48);
            $asset->module ??= 'gallery';
        });
        static::updating(static function (self $asset): void {
            if ($asset->isDirty('token') || $asset->isDirty('module')) {
                throw new LogicException('File token and module are immutable.');
            }
        });
    }

    public function getRouteKeyName(): string
    {
        return 'token';
    }

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

    public function isReferenced(): bool
    {
        return $this->isAssigned()
            || (Schema::hasColumn('users', 'avatar_media_asset_id')
                && $this->usersUsingAsAvatar()->withTrashed()->exists());
    }

    /** @return HasMany<User, $this> */
    public function usersUsingAsAvatar(): HasMany
    {
        return $this->hasMany(User::class, 'avatar_media_asset_id');
    }
}
