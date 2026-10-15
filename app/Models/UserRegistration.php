<?php

namespace App\Models;

use App\Enums\RegistrationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $password
 * @property RegistrationStatus $status
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User|null $reviewer
 */
class UserRegistration extends Model
{
    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'status' => RegistrationStatus::class,
            'reviewed_by' => 'integer',
            'reviewed_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by')->withTrashed();
    }
}
