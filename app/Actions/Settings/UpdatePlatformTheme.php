<?php

namespace App\Actions\Settings;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\SystemSetting;
use App\Models\User;
use App\Support\SystemSettings;
use Illuminate\Support\Facades\DB;

class UpdatePlatformTheme
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(string $theme, User $actor): void
    {
        $before = ['theme' => SystemSettings::theme()];

        DB::transaction(function () use ($theme, $actor, $before): void {
            SystemSetting::query()->updateOrCreate(
                ['key' => SystemSettings::THEME],
                ['value' => $theme, 'updated_by' => $actor->getKey()],
            );

            SystemSettings::forgetCache();

            $this->audit->record(
                event: 'settings.layout.updated',
                actor: $actor,
                before: $before,
                after: ['theme' => $theme],
            );
        });
    }
}
