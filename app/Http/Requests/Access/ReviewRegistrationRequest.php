<?php

namespace App\Http\Requests\Access;

use Illuminate\Foundation\Http\FormRequest;

class ReviewRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('users.review_registrations')
            && $this->user()->can('roles.assign');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'role_id' => ['required', 'integer', 'exists:roles,id'],
        ];
    }
}
