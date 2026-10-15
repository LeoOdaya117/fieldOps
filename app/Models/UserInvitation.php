<?php

namespace App\Models;

use App\Models\Concerns\HasRecordStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property string $email
 * @property int $role_id
 * @property int $invited_by
 * @property string $token_hash
 * @property Carbon $expires_at
 * @property Carbon|null $accepted_at
 * @property Carbon|null $revoked_at
 * @property string $status
 * @property int $record_status
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property-read Role $role
 * @property-read User|null $createdBy
 * @property-read User|null $updatedBy
 */
class UserInvitation extends Model
{
    use HasRecordStatus, Notifiable;

    protected $fillable = [
        'email',
        'role_id',
        'invited_by',
        'token_hash',
        'expires_at',
        'accepted_at',
        'revoked_at',
        'status',
        'record_status',
        'created_by',
        'updated_by',
    ];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'immutable_datetime',
            'accepted_at' => 'immutable_datetime',
            'revoked_at' => 'immutable_datetime',
            'record_status' => 'integer',
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
    }

    /** @return BelongsTo<Role, $this> */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /** @return BelongsTo<User, $this> */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by')->withTrashed();
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

    public function isUsable(): bool
    {
        return $this->accepted_at === null
            && $this->revoked_at === null
            && $this->expires_at->isFuture();
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function generateToken(): string
    {
        return Str::random(64);
    }
}
