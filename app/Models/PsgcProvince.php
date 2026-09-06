<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PsgcProvince extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'code';

    protected $keyType = 'string';

    protected $fillable = ['code', 'region_code', 'name'];

    /** @return BelongsTo<PsgcRegion, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(PsgcRegion::class, 'region_code', 'code');
    }

    /** @return HasMany<PsgcLocality, $this> */
    public function localities(): HasMany
    {
        return $this->hasMany(PsgcLocality::class, 'province_code', 'code');
    }
}
