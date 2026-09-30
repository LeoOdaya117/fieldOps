<?php

namespace App\Http\Requests\Media;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMediaAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->isActive()
            && $user->email_verified_at !== null
            && $user->can($this->is('media-assets') ? 'media_assets.create' : 'files.create');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $gallery = $this->is('media-assets');
        $maximumSize = (int) config($gallery ? 'media-assets.gallery_max_file_size_kilobytes' : 'media-assets.max_file_size_kilobytes');
        $maximumDimension = (int) config('media-assets.max_dimension_pixels', 8192);

        return [
            'file' => [
                'required',
                'file',
                'mimetypes:'.implode(',', $gallery
                    ? ['image/jpeg', 'image/png', 'image/webp']
                    : config('media-assets.allowed_mime_types')),
                "max:{$maximumSize}",
                ...($gallery ? ["dimensions:max_width={$maximumDimension},max_height={$maximumDimension}"] : []),
            ],
            'source' => [$gallery ? 'required' : 'sometimes', 'string', Rule::in($gallery ? ['upload', 'camera'] : ['upload'])],
            'module' => [$gallery ? 'prohibited' : 'sometimes', 'string', Rule::in(['files'])],
            'tag' => ['nullable', 'string', 'max:64'],
        ];
    }
}
