<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Settings\UpdatePlatformTheme;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdatePlatformThemeRequest;
use App\Support\SystemSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlatformLayoutController extends Controller
{
    public function edit(Request $request): Response
    {
        abort_unless($request->user()->can('settings.manage_system'), 403);

        return Inertia::render('settings/system/layout', [
            'currentTheme' => SystemSettings::theme(),
            'themes' => SystemSettings::themeDefinitions(),
        ]);
    }

    public function update(
        UpdatePlatformThemeRequest $request,
        UpdatePlatformTheme $update,
    ): RedirectResponse {
        $update->execute((string) $request->validated('theme'), $request->user());

        return to_route('system-settings.layout.edit')
            ->with('success', 'Application layout updated.');
    }
}
