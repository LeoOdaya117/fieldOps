<?php

namespace App\Http\Requests\Access;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBlockedIpAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ip_blocks.manage') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $reason = $this->input('reason');

        $this->merge([
            'reason' => is_string($reason) ? trim($reason) ?: null : $reason,
        ]);
    }
}
