<?php

namespace App\Http\Requests\Media;

use Illuminate\Foundation\Http\FormRequest;

class RenameMediaAssetRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $name = $this->input('name');

        $this->merge(['name' => is_string($name) ? trim($name) : $name]);
    }

    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->isActive()
            && $user->email_verified_at !== null
            && $user->can('media_assets.update');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
        ];
    }

    public function validatedName(): string
    {
        return (string) $this->validated('name');
    }
}
