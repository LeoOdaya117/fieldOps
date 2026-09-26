<?php

namespace App\Http\Requests\Access;

use Illuminate\Foundation\Http\FormRequest;

class DeleteBlockedIpAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ip_blocks.delete') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }
}
