<?php

namespace App\Http\Requests\Backups;

class UploadBackupRequest extends BackupRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['package' => ['required', 'file', 'mimetypes:application/zip,application/x-zip,application/x-zip-compressed,application/octet-stream',
            'max:'.(int) ceil((int) config('backups.upload_max_bytes') / 1024)], 'audit_note' => ['nullable', 'string', 'max:1000']];
    }
}
