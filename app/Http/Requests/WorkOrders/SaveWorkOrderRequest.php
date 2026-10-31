<?php

namespace App\Http\Requests\WorkOrders;

use App\Models\WorkOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveWorkOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $permission = $this->isMethod('post') ? 'work_orders.create' : 'work_orders.update';

        return $this->user()?->can($permission) === true;
    }

    protected function prepareForValidation(): void
    {
        $reference = $this->input('reference');
        $title = $this->input('title');
        $instructions = $this->input('instructions');
        $locationLabel = $this->input('location_label');
        $this->merge([
            'reference' => is_string($reference) ? strtoupper(trim($reference)) : $reference,
            'title' => is_string($title) ? trim($title) : $title,
            'instructions' => is_string($instructions) ? trim($instructions) : $instructions,
            'location_label' => is_string($locationLabel) ? trim($locationLabel) : $locationLabel,
        ]);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $isCreate = $this->isMethod('post');

        return [
            'reference' => $isCreate
                ? ['bail', 'required', 'string', 'min:2', 'max:32', 'regex:/^[A-Z0-9][A-Z0-9._-]+$/', Rule::unique('work_orders', 'reference')]
                : ['prohibited'],
            'status' => ['prohibited'],
            'record_status' => ['prohibited'],
            'version' => $isCreate ? ['prohibited'] : ['bail', 'required', 'integer', 'min:1'],
            'title' => ['bail', 'required', 'string', 'max:160'],
            'instructions' => ['bail', 'nullable', 'string', 'max:5000'],
            'priority' => ['bail', 'required', 'string', Rule::in(WorkOrder::PRIORITIES)],
            'due_date' => ['bail', 'required', 'date_format:Y-m-d'],
            'asset_id' => ['bail', 'nullable', 'integer', 'exists:assets,id'],
            'location_label' => ['bail', 'nullable', 'required_without:asset_id', 'string', 'max:255'],
            'latitude' => ['bail', 'nullable', 'required_without:asset_id', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['bail', 'nullable', 'required_without:asset_id', 'required_with:latitude', 'numeric', 'between:-180,180'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->filled('latitude') !== $this->filled('longitude')) {
                $validator->errors()->add('coordinates', 'Enter both latitude and longitude.');
            }

            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $assetId = $this->input('asset_id');
            if (! is_numeric($assetId)) {
                return;
            }

            $currentAssetId = null;
            $workOrderId = $this->route('workOrder');
            if (! $this->isMethod('post') && is_numeric($workOrderId)) {
                $currentAssetId = DB::table('work_orders')->where('id', (int) $workOrderId)->value('asset_id');
            }

            if ((int) $currentAssetId !== (int) $assetId
                && ! DB::table('assets')->where('id', (int) $assetId)->where('record_status', 1)->exists()) {
                $validator->errors()->add('asset_id', 'Select an active asset.');
            }

        });
    }

    /** @return array{reference: string, title: string, instructions: string|null, priority: string, due_date: string, asset_id: int|null, location_label: string|null, latitude: float|null, longitude: float|null} */
    public function validatedWorkOrderForCreate(): array
    {
        $data = $this->validated();

        return [
            'reference' => (string) $data['reference'],
            ...$this->validatedWorkOrderFields($data),
        ];
    }

    /** @return array{version: int, title: string, instructions: string|null, priority: string, due_date: string, asset_id: int|null, location_label: string|null, latitude: float|null, longitude: float|null} */
    public function validatedWorkOrderForUpdate(): array
    {
        $data = $this->validated();

        return [
            'version' => (int) $data['version'],
            ...$this->validatedWorkOrderFields($data),
        ];
    }

    /** @param array<string, mixed> $data
     * @return array{title: string, instructions: string|null, priority: string, due_date: string, asset_id: int|null, location_label: string|null, latitude: float|null, longitude: float|null}
     */
    private function validatedWorkOrderFields(array $data): array
    {
        return [
            'title' => (string) $data['title'],
            'instructions' => isset($data['instructions']) ? (string) $data['instructions'] : null,
            'priority' => (string) $data['priority'],
            'due_date' => (string) $data['due_date'],
            'asset_id' => isset($data['asset_id']) ? (int) $data['asset_id'] : null,
            'location_label' => isset($data['location_label']) ? (string) $data['location_label'] : null,
            'latitude' => isset($data['latitude']) ? (float) $data['latitude'] : null,
            'longitude' => isset($data['longitude']) ? (float) $data['longitude'] : null,
        ];
    }
}
