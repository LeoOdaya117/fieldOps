<?php

namespace App\Http\Requests\System;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveTimezoneRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('timezones.manage') === true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:64',
                'timezone',
                Rule::unique('timezones', 'name')->ignore($this->route('timezone')),
            ],
        ];
    }

    /** @return array{name: string} */
    public function validatedTimezone(): array
    {
        $data = $this->validated();

        return [
            'name' => (string) $data['name'],
        ];
    }
}
