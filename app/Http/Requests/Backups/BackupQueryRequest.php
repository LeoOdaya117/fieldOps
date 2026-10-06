<?php

namespace App\Http\Requests\Backups;

use Illuminate\Validation\Rule;

class BackupQueryRequest extends BackupRequest
{
    /** @return array<string,mixed> */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:200'], 'actor' => ['nullable', 'string', 'max:200'],
            'scope' => ['nullable', Rule::in(['database', 'tables'])],
            'kind' => ['nullable', Rule::in(['manual', 'safety', 'uploaded'])],
            'event' => ['nullable', 'string', 'max:100'], 'backup' => ['nullable', 'uuid'],
            'from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d', ...($this->filled('from') ? ['after_or_equal:from'] : [])],
            'per_page' => ['sometimes', 'integer', Rule::in([10, 15, 25, 50, 100])],
            'page' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
            'sort' => ['sometimes', Rule::in(['created_at', 'scope', 'kind', 'size_bytes', 'event', 'actor', 'table_count'])],
            'status' => ['nullable', Rule::in(['queued', 'running', 'succeeded', 'failed', 'interrupted', 'requested', 'verified'])],
            'direction' => ['sometimes', Rule::in(['asc', 'desc'])],
        ];
    }

    /** @return array<string,mixed> */
    public function filters(): array
    {
        return [...['search' => '', 'actor' => '', 'scope' => '', 'kind' => '', 'event' => '', 'backup' => '',
            'from' => '', 'to' => '', 'status' => '', 'per_page' => 15, 'page' => 1, 'sort' => 'created_at', 'direction' => 'desc'], ...$this->validated()];
    }
}
