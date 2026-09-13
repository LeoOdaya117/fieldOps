<?php

namespace App\Http\Requests\System;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCountryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('countries.manage') === true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper(trim((string) $this->input('code'))),
            'name' => trim((string) $this->input('name')),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'code' => [
                'required',
                'string',
                'size:2',
                'regex:/^[A-Z]{2}$/',
                Rule::unique('countries', 'code')->ignore($this->route('country')),
            ],
            'name' => ['required', 'string', 'max:120'],
        ];
    }

    /** @return array{code: string, name: string} */
    public function validatedCountry(): array
    {
        $data = $this->validated();

        return [
            'code' => (string) $data['code'],
            'name' => (string) $data['name'],
        ];
    }
}
