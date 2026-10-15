<?php

namespace App\Actions\Exports;

use App\Models\ExportArtifact;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class ExportArtifactAccess
{
    public function canGenerate(ExportArtifact $artifact, User $user): bool
    {
        if ((int) $artifact->owner_id !== (int) $user->getKey()
            || ! $user->isActive()
            || $artifact->expires_at->isPast()) {
            return false;
        }

        $registry = app(ExportDatasetRegistry::class);
        if (! $registry->canExport($user, $artifact->dataset, $artifact->format)) {
            return false;
        }

        if ($artifact->dataset === 'files') {
            $filters = $artifact->filters;
            $scopes = $filters['_file_scopes'] ?? [];
            if (! is_array($scopes)) {
                return false;
            }
            $currentScopes = $registry->eligibleFileScopes(
                $user,
                $artifact->format,
                includeDeleted: ($filters['record_status'] ?? 'active') === 'inactive',
            );
            foreach ($scopes as $module => $scope) {
                if (! isset($currentScopes[$module]) || ($scope === 'all' && $currentScopes[$module] !== 'all')) {
                    return false;
                }
            }
        }

        return true;
    }

    public function canResolve(ExportArtifact $artifact, User $user): bool
    {
        if ($artifact->status !== 'ready'
            || $artifact->expires_at->isPast()
            || $artifact->path === null
            || ! Storage::disk($artifact->disk)->exists($artifact->path)) {
            return false;
        }

        return $this->canGenerate($artifact, $user);
    }

    public function resolveOrFail(ExportArtifact $artifact, User $user): void
    {
        abort_unless($this->canResolve($artifact, $user), 404);
    }
}
