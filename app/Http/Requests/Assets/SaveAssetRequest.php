<?php

namespace App\Http\Requests\Assets;

use App\Models\Asset;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        $permission = $this->isMethod('post') ? 'assets.create' : 'assets.update';

        return $this->user()?->can($permission) === true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper(trim((string) $this->input('code'))),
            'name' => trim((string) $this->input('name')),
            'category' => trim((string) $this->input('category')),
            'condition' => trim((string) $this->input('condition')),
        ]);
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $routeAsset = $this->route('asset');
        $uniqueCode = Rule::unique('assets', 'code');

        if ($routeAsset instanceof Asset) {
            $uniqueCode->ignore($routeAsset->getKey());
        }

        return [
            'code' => ['required', 'string', 'min:2', 'max:32', 'regex:/^[A-Z0-9][A-Z0-9._-]+$/', $uniqueCode],
            'name' => ['required', 'string', 'max:160'],
            'category' => ['required', 'string', 'max:80'],
            'condition' => ['required', 'string', Rule::in(Asset::CONDITIONS)],
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $hasLatitude = $this->filled('latitude');
            $hasLongitude = $this->filled('longitude');

            if ($hasLatitude !== $hasLongitude) {
                $validator->errors()->add('coordinates', 'Enter both latitude and longitude, or leave both blank.');
            }
        });
    }

    /** @return array{code: string, name: string, category: string, condition: string, latitude: float|null, longitude: float|null} */
    public function validatedAsset(): array
    {
        $data = $this->validated();

        return [
            'code' => (string) $data['code'],
            'name' => (string) $data['name'],
            'category' => (string) $data['category'],
            'condition' => (string) $data['condition'],
            'latitude' => isset($data['latitude']) ? (float) $data['latitude'] : null,
            'longitude' => isset($data['longitude']) ? (float) $data['longitude'] : null,
        ];
    }
}
