<?php

namespace App\Http\Requests\Settings;

use App\Models\OrganizationLocation;
use Illuminate\Foundation\Http\FormRequest;

class UpdateOrganizationMapRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        if ($user === null
            || ! $user->isActive()
            || $user->email_verified_at === null
            || ! $user->can('settings.update')) {
            return false;
        }

        $location = OrganizationLocation::query()
            ->withoutGlobalScope('record_status')
            ->where('scope', OrganizationLocation::PRIMARY_SCOPE)
            ->first();

        if ($location?->trashed()) {
            return false;
        }

        return $location === null
            ? $user->can('organization_locations.create')
            : $user->can('organization_locations.update');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'latitude' => $this->filled('latitude') ? $this->input('latitude') : null,
            'longitude' => $this->filled('longitude') ? $this->input('longitude') : null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
        ];
    }

    /** @return array{latitude:?float,longitude:?float} */
    public function validatedMap(): array
    {
        $data = $this->validated();

        return [
            'latitude' => isset($data['latitude']) ? (float) $data['latitude'] : null,
            'longitude' => isset($data['longitude']) ? (float) $data['longitude'] : null,
        ];
    }
}
