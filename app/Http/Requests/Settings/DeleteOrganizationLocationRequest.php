<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class DeleteOrganizationLocationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->isActive()
            && $user->email_verified_at !== null
            && $user->can('settings.update')
            && $user->can('organization_locations.delete');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }
}
