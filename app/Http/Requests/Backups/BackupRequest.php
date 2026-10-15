<?php

namespace App\Http\Requests\Backups;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class BackupRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user instanceof User && $user->isActive() && $user->record_status === 1
            && $user->email_verified_at !== null && $user->isSuperAdmin();
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }

    /** @return array{actor:array{id:string|null,name:string,source:string},audit_note:string} */
    public function auditContext(): array
    {
        $user = $this->user();
        abort_unless($user instanceof User, 403);

        return ['actor' => ['id' => (string) $user->getKey(), 'name' => $user->name, 'source' => 'web'],
            'audit_note' => (string) $this->validated('audit_note', '')];
    }
}
