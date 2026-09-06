<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Settings\UpdateOrganizationLocation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateOrganizationMapRequest;
use App\Models\OrganizationLocation;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationMapController extends Controller
{
    public function edit(): Response
    {
        $location = OrganizationLocation::query()
            ->where('scope', OrganizationLocation::PRIMARY_SCOPE)
            ->first();

        return Inertia::render('settings/system/map', [
            'coordinate' => $location?->latitude !== null && $location->longitude !== null
                ? ['latitude' => $location->latitude, 'longitude' => $location->longitude]
                : null,
        ]);
    }

    public function update(
        UpdateOrganizationMapRequest $request,
        UpdateOrganizationLocation $update,
    ): RedirectResponse {
        $update->map($request->validatedMap(), $request->user());

        return to_route('system-settings.map.edit')->with('success', 'Map location updated.');
    }
}
