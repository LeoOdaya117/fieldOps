<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationLocation extends Model
{
    use HasRecordStatus;

    public const PRIMARY_SCOPE = 'primary';

    protected $fillable = [
        'scope', 'region_code', 'province_code', 'locality_code',
        'latitude', 'longitude', 'created_by', 'updated_by', 'record_status',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'float',
            'longitude' => 'float',
            'record_status' => 'integer',
        ];
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

    /** @return BelongsTo<PsgcLocality, $this> */
    public function locality(): BelongsTo
    {
        return $this->belongsTo(PsgcLocality::class, 'locality_code', 'code');
    }
}
