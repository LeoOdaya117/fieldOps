<?php

namespace App\Http\Requests\Media;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMediaAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && $user->isActive() && $user->email_verified_at !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $maximumSize = (int) config('media-assets.max_file_size_kilobytes', 5120);
        $maximumDimension = (int) config('media-assets.max_dimension_pixels', 8192);

        return [
            'file' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/png,image/webp',
                "max:{$maximumSize}",
                "dimensions:max_width={$maximumDimension},max_height={$maximumDimension}",
            ],
            'source' => ['required', 'string', Rule::in(['upload', 'camera'])],
        ];
    }
}
