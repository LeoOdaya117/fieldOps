<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformImageAssignment extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'slot';

    protected $keyType = 'string';

    protected $fillable = ['slot', 'media_asset_id', 'version', 'created_by', 'updated_by'];

    protected function casts(): array
    {
        return ['version' => 'integer'];
    }

    /** @return BelongsTo<MediaAsset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'media_asset_id');
    }
}
