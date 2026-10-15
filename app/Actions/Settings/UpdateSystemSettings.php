<?php

namespace App\Actions\Settings;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\SystemSettings;
use Illuminate\Support\Facades\DB;

class UpdateSystemSettings
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    /**
     * @param  array{name: string, timezone: string, pagination_size: int, idle_timeout_seconds: int, login_max_attempts: int, login_decay_minutes: int}  $data
     */
    public function execute(array $data, User $actor): void
    {
        $before = SystemSettings::values();

        DB::transaction(function () use ($data, $actor, $before): void {
            $settings = [
                SystemSettings::NAME => $data['name'],
                SystemSettings::TIMEZONE => $data['timezone'],
                SystemSettings::PAGINATION_SIZE => (string) $data['pagination_size'],
                SystemSettings::IDLE_TIMEOUT_SECONDS => (string) $data['idle_timeout_seconds'],
                SystemSettings::LOGIN_MAX_ATTEMPTS => (string) $data['login_max_attempts'],
                SystemSettings::LOGIN_DECAY_MINUTES => (string) $data['login_decay_minutes'],
            ];

            foreach ($settings as $key => $value) {
                SystemSetting::query()->updateOrCreate(
                    ['key' => $key],
                    [
                        'value' => (string) $value,
                        'updated_by' => $actor->getKey(),
                    ],
                );
            }

            SystemSettings::forgetCache();

            $this->audit->record(
                event: 'settings.system.updated',
                actor: $actor,
                before: $before,
                after: array_map(static fn (mixed $value): string => (string) $value, $settings),
            );
        });
    }
}
