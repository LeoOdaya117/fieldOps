<?php

namespace App\Actions\Assets;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\Asset;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManageAsset
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    /** @param array{code: string, name: string, category: string, condition: string, latitude: float|null, longitude: float|null} $data */
    public function create(array $data, User $actor): Asset
    {
        try {
            return DB::transaction(function () use ($data, $actor): Asset {
                $asset = Asset::query()->create([
                    ...$data,
                    'created_by' => $actor->getKey(),
                    'updated_by' => $actor->getKey(),
                ]);
                $this->audit->record('asset.created', $actor, $asset, null, $this->snapshot($asset));

                return $asset;
            });
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }

            throw ValidationException::withMessages(['code' => 'This asset code is already in use.']);
        }
    }

    /** @param array{code: string, name: string, category: string, condition: string, latitude: float|null, longitude: float|null} $data */
    public function update(Asset $asset, array $data, User $actor): void
    {
        try {
            DB::transaction(function () use ($asset, $data, $actor): void {
                $asset = Asset::query()->lockForUpdate()->whereKey($asset->getKey())->firstOrFail();
                $before = $this->snapshot($asset);
                $asset->forceFill([...$data, 'updated_by' => $actor->getKey()])->save();
                $after = $this->snapshot($asset);

                if ($before !== $after) {
                    $this->audit->record('asset.updated', $actor, $asset, $before, $after);
                }
            });
        } catch (QueryException $exception) {
            if (! $this->isUniqueViolation($exception)) {
                throw $exception;
            }

            throw ValidationException::withMessages(['code' => 'This asset code is already in use.']);
        }
    }

    private function isUniqueViolation(QueryException $exception): bool
    {
        return str_contains(strtolower($exception->getMessage()), 'assets_code_unique')
            || str_contains(strtolower($exception->getMessage()), 'unique constraint failed: assets.code');
    }

    /** @return array{code: string, name: string, category: string, condition: string, latitude: float|null, longitude: float|null, record_status: int} */
    private function snapshot(Asset $asset): array
    {
        return [
            'code' => $asset->code,
            'name' => $asset->name,
            'category' => $asset->category,
            'condition' => $asset->condition,
            'latitude' => $asset->latitude,
            'longitude' => $asset->longitude,
            'record_status' => (int) $asset->record_status,
        ];
    }
}
