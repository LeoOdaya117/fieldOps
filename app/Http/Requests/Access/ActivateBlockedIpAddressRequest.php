<?php

namespace App\Http\Requests\Access;

use App\Models\BlockedIpAddress;
use Illuminate\Foundation\Http\FormRequest;

class ActivateBlockedIpAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('blockedIpAddress') instanceof BlockedIpAddress
            && $this->user()?->can('ip_blocks.manage') === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }
}
