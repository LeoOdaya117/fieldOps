<?php

namespace App\Http\Requests\Assets;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetEvidenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('assets.view')
            && $this->user()->can('assets.update');
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $mimeTypes = implode(',', (array) config('media-assets.allowed_mime_types'));

        return [
            'file' => ['required', 'file', "mimetypes:{$mimeTypes}", 'max:'.(int) config('media-assets.max_file_size_kilobytes', 102400)],
        ];
    }
}
