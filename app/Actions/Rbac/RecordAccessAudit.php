<?php

namespace App\Actions\Rbac;

use App\Models\AccessAuditEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class RecordAccessAudit
{
    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function record(
        string $event,
        ?User $actor = null,
        ?Model $subject = null,
        ?array $before = null,
        ?array $after = null,
    ): AccessAuditEvent {
        $request = app()->bound('request') ? request() : null;

        return AccessAuditEvent::query()->create([
            'actor_user_id' => $actor?->getKey(),
            'event' => $event,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'before' => $before,
            'after' => $after,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'occurred_at' => now(),
        ]);
    }
}
