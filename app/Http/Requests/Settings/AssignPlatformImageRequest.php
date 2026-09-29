<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignPlatformImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->isActive()
            && $user->email_verified_at !== null
            && $user->isSuperAdmin();
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'asset_token' => [
                'required',
                'string',
                Rule::exists('media_assets', 'token')
                    ->where('uploader_id', $this->user()?->getKey())
                    ->where('module', 'gallery')
                    ->where('record_status', 1),
            ],
        ];
    }
}
