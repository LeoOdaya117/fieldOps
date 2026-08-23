<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

/**
 * Applies the active record filter and replaces bulk deletes with soft deletes.
 *
 * @implements Scope<Model>
 */
class RecordStatusScope implements Scope
{
    public function __construct(private readonly bool $applyFilter = true) {}

    public function apply(Builder $builder, Model $model): void
    {
        if ($this->applyFilter) {
            $builder->where($model->qualifyColumn('record_status'), 1);
        }
    }

    /** @param Builder<Model> $builder */
    public function extend(Builder $builder): void
    {
        $builder->onDelete(static function (Builder $builder): mixed {
            $values = ['record_status' => 0];

            if (($actorId = Auth::id()) !== null) {
                $values['updated_by'] = $actorId;
            }

            return $builder->update($values);
        });
    }
}
