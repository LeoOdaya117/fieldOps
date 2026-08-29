<?php

namespace App\Models\Concerns;

use App\Models\Scopes\RecordStatusScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * Adds an application-level soft-delete flag and audit actor tracking.
 *
 * Records remain in the database when deleted. The default query scope only
 * returns rows with record_status = 1, while delete() marks the row as 0.
 */
trait HasRecordStatus
{
    public static function bootHasRecordStatus(): void
    {
        static::addGlobalScope('record_status', new RecordStatusScope);
        // Keep bulk Eloquent deletes on the same soft-delete path as model delete().
        static::addGlobalScope('record_status_delete_guard', new RecordStatusScope(false));

        static::creating(static function (Model $model): void {
            if ($model->getAttribute('record_status') === null) {
                $model->setAttribute('record_status', 1);
            }

            $actorId = Auth::id();

            if ($actorId !== null) {
                $model->setAttribute('created_by', $model->getAttribute('created_by') ?? $actorId);
                $model->setAttribute('updated_by', $model->getAttribute('updated_by') ?? $actorId);
            }
        });

        static::updating(static function (Model $model): void {
            if (($actorId = Auth::id()) !== null) {
                $model->setAttribute('updated_by', $actorId);
            }
        });
    }

    public function delete(): ?bool
    {
        if (! $this->exists) {
            return null;
        }

        if ($this->fireModelEvent('deleting') === false) {
            return false;
        }

        $this->setAttribute('record_status', 0);

        if (($actorId = Auth::id()) !== null) {
            $this->setAttribute('updated_by', $actorId);
        }

        $this->saveQuietly();
        $this->fireModelEvent('deleted', false);

        return true;
    }

    public function restore(): bool
    {
        if (! $this->exists || ! $this->trashed()) {
            return false;
        }

        if ($this->fireModelEvent('restoring') === false) {
            return false;
        }

        $this->setAttribute('record_status', 1);

        if (($actorId = Auth::id()) !== null) {
            $this->setAttribute('updated_by', $actorId);
        }

        $this->saveQuietly();
        $this->fireModelEvent('restored', false);

        return true;
    }

    public function trashed(): bool
    {
        return (int) $this->getAttribute('record_status') === 0;
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeWithTrashed(Builder $query): Builder
    {
        return $query->withoutGlobalScope('record_status');
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeOnlyTrashed(Builder $query): Builder
    {
        $model = $query->getModel();

        return $query
            ->withoutGlobalScope('record_status')
            ->where($model->qualifyColumn('record_status'), 0);
    }
}
