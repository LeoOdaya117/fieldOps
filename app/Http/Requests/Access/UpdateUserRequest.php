<?php

namespace App\Http\Requests\Access;

use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    use ProfileValidationRules;

    public function authorize(): bool
    {
        $subject = $this->route('user');

        return $subject instanceof User
            && $this->user()?->can('update', $subject) === true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => mb_strtolower(trim((string) $this->input('email'))),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $subject = $this->route('user');

        return [
            ...$this->profileRules($subject instanceof User ? $subject->getKey() : null),
            'position' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'remove_photo' => ['sometimes', 'boolean'],
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'blocked' => ['required', 'boolean'],
        ];
    }
}
