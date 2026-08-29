<?php

namespace App\Http\Requests\Access;

use App\Support\Security\IpAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBlockedIpAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('ip_blocks.manage') === true;
    }

    protected function prepareForValidation(): void
    {
        $rawIpAddress = $this->input('ip_address');
        $rawReason = $this->input('reason');

        $this->merge([
            'ip_address' => is_string($rawIpAddress)
                ? IpAddress::normalize($rawIpAddress) ?? $rawIpAddress
                : $rawIpAddress,
            'reason' => is_string($rawReason) ? trim($rawReason) ?: null : $rawReason,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'ip_address' => [
                'required',
                'ip',
                Rule::unique('blocked_ip_addresses', 'ip_address')->where(
                    static fn ($query) => $query
                        ->where('is_active', true)
                        ->where('record_status', 1),
                ),
            ],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
