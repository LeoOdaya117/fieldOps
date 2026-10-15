<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\Concerns\HasRecordStatus;
use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string|null $position
 * @property string|null $department
 * @property string|null $avatar_path
 * @property-read string|null $avatar
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property UserStatus $status
 * @property int $record_status
 * @property int $session_version
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property CarbonImmutable|null $suspended_at
 * @property int|null $suspended_by
 * @property-read Collection<int, Role> $roles
 * @property-read Collection<int, Permission> $permissions
 * @property-read User|null $createdBy
 * @property-read User|null $updatedBy
 */
#[Fillable(['name', 'email', 'position', 'department', 'avatar_path', 'password', 'email_verified_at', 'status', 'suspended_at', 'suspended_by', 'created_by', 'updated_by', 'record_status'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'session_version', 'avatar_path', 'avatar_media_asset_id'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRecordStatus, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    protected $appends = ['avatar'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => UserStatus::class,
            'record_status' => 'integer',
            'session_version' => 'integer',
            'created_by' => 'integer',
            'updated_by' => 'integer',
            'suspended_at' => 'immutable_datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function getAvatarAttribute(): ?string
    {
        $asset = $this->avatarMediaAsset;
        if ($asset !== null && $asset->token !== null) {
            return route('files.content', $asset->token, false);
        }

        return $this->avatar_path === null
            ? null
            : Storage::disk('public')->url($this->avatar_path);
    }

    /** @return BelongsTo<MediaAsset, $this> */
    public function avatarMediaAsset(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'avatar_media_asset_id');
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    /** @return MorphToMany<Role, $this> */
    public function roles(): MorphToMany
    {
        return $this->morphToMany(Role::class, 'model', 'model_has_roles', 'model_id', 'role_id');
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(RoleName::SuperAdmin->value);
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
