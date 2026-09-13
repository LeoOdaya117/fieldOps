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
            && $user->isOwner();
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'asset_id' => [
                'required',
                'integer',
                Rule::exists('media_assets', 'id')
                    ->where('uploader_id', $this->user()?->getKey())
                    ->where('record_status', 1),
            ],
        ];
    }
}
