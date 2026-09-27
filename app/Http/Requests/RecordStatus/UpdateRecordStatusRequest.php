<?php

namespace App\Http\Requests\RecordStatus;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRecordStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'record_status' => ['required', 'integer', 'in:0,1'],
        ];
    }
}
