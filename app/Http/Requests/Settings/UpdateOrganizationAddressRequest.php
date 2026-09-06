<?php

namespace App\Http\Requests\Settings;

use App\Models\PsgcLocality;
use App\Models\PsgcProvince;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateOrganizationAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->isActive()
            && $user->email_verified_at !== null
            && $user->can('settings.manage_system');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'province_code' => $this->filled('province_code') ? $this->input('province_code') : null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'region_code' => ['required', 'string', Rule::exists('psgc_regions', 'code')],
            'province_code' => ['nullable', 'string', Rule::exists('psgc_provinces', 'code')],
            'locality_code' => ['required', 'string', Rule::exists('psgc_localities', 'code')],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $regionCode = (string) $this->input('region_code');
            $provinceCode = $this->input('province_code');
            $provinceCode = is_string($provinceCode) && $provinceCode !== '' ? $provinceCode : null;
            $locality = PsgcLocality::query()->find((string) $this->input('locality_code'));

            if ($provinceCode !== null) {
                $province = PsgcProvince::query()->find($provinceCode);

                if ($province?->region_code !== $regionCode) {
                    $validator->errors()->add('province_code', 'The selected province does not belong to this region.');
                }
            }

            if ($locality?->region_code !== $regionCode) {
                $validator->errors()->add('locality_code', 'The selected city or municipality does not belong to this region.');

                return;
            }

            if ($locality->province_code !== $provinceCode) {
                $validator->errors()->add(
                    'locality_code',
                    $locality->is_independent
                        ? 'Independent cities cannot be assigned to a province.'
                        : 'The selected city or municipality does not belong to this province.',
                );
            }
        }];
    }

    /** @return array{region_code:string,province_code:?string,locality_code:string} */
    public function validatedAddress(): array
    {
        $data = $this->validated();

        return [
            'region_code' => (string) $data['region_code'],
            'province_code' => isset($data['province_code']) ? (string) $data['province_code'] : null,
            'locality_code' => (string) $data['locality_code'],
        ];
    }
}
