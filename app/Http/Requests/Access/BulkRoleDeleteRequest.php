<?php

namespace App\Http\Requests\Access;

use Illuminate\Foundation\Http\FormRequest;

class BulkRoleDeleteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('roles.delete');
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct', 'exists:roles,id'],
        ];
    }
}
