<?php

namespace App\Http\Requests\System;

use Illuminate\Foundation\Http\FormRequest;

class DeleteCountryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('countries.manage') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }
}
