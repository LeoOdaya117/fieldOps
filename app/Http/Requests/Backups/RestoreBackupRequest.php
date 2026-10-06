<?php

namespace App\Http\Requests\Backups;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RestoreBackupRequest extends BackupRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['database_name' => ['required', 'string', Rule::in([DB::connection()->getDatabaseName()])],
            'audit_note' => ['nullable', 'string', 'max:1000']];
    }
}
