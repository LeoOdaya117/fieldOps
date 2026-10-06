<?php

namespace App\Http\Requests\Backups;

use Illuminate\Validation\Rule;

class StoreBackupRequest extends BackupRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(['scope' => $this->input('scope', 'database')]);
    }

    /** @return array<string,mixed> */
    public function rules(): array
    {
        return [
            'scope' => ['required', Rule::in(['database', 'tables'])],
            'requested_tables' => ['required_if:scope,tables', 'exclude_unless:scope,tables', 'array', 'min:1', 'max:1000'],
            'requested_tables.*' => ['required', 'string', 'max:64', 'distinct', 'regex:/\A[a-zA-Z_][a-zA-Z0-9_]*\z/'],
            'audit_note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
