<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PsgcRegion extends Model
{
    public $incrementing = false;

    public $timestamps = false;

    protected $primaryKey = 'code';

    protected $keyType = 'string';

    protected $fillable = ['code', 'name'];

    /** @return HasMany<PsgcProvince, $this> */
    public function provinces(): HasMany
    {
        return $this->hasMany(PsgcProvince::class, 'region_code', 'code');
    }

    /** @return HasMany<PsgcLocality, $this> */
    public function localities(): HasMany
    {
        return $this->hasMany(PsgcLocality::class, 'region_code', 'code');
    }
}
