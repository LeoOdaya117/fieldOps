<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Settings\UpdateSystemSettings;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateSystemSettingsRequest;
use App\Support\SystemSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingsController extends Controller
{
    public function edit(Request $request): Response
    {
        $this->authorizeSystemSettings($request);

        return Inertia::render('settings/system', [
            'settings' => SystemSettings::values(),
            'timezones' => SystemSettings::timezoneOptions(),
            'paginationOptions' => SystemSettings::paginationOptions(),
            'maximumIdleTimeoutSeconds' => SystemSettings::maximumIdleTimeoutSeconds(),
        ]);
    }

    public function update(
        UpdateSystemSettingsRequest $request,
        UpdateSystemSettings $update,
    ): RedirectResponse {
        $update->execute($request->validatedSettings(), $request->user());

        return to_route('system-settings.edit')->with('success', 'System settings updated.');
    }

    private function authorizeSystemSettings(Request $request): void
    {
        $user = $request->user();

        abort_unless(
            $user->isActive()
                && $user->email_verified_at !== null
                && $user->can('settings.manage_system'),
            403,
        );
    }
}
