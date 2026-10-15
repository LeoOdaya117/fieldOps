<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsgcLocality extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'code';

    protected $keyType = 'string';

    protected $fillable = ['code', 'region_code', 'province_code', 'name', 'type', 'is_independent'];

    protected function casts(): array
    {
        return ['is_independent' => 'boolean'];
    }

    /** @return BelongsTo<PsgcRegion, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(PsgcRegion::class, 'region_code', 'code');
    }

    /** @return BelongsTo<PsgcProvince, $this> */
    public function province(): BelongsTo
    {
        return $this->belongsTo(PsgcProvince::class, 'province_code', 'code');
    }
}
