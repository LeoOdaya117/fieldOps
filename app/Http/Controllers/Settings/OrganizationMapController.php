<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Settings\UpdateOrganizationLocation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateOrganizationMapRequest;
use App\Models\OrganizationLocation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationMapController extends Controller
{
    public function edit(Request $request): Response
    {
        $canViewDeleted = $request->user()?->can('organization_locations.view_deleted') === true;
        $query = $canViewDeleted ? OrganizationLocation::withTrashed() : OrganizationLocation::query();
        $location = $query
            ->where('scope', OrganizationLocation::PRIMARY_SCOPE)
            ->first();

        return Inertia::render('settings/system/map', [
            'coordinate' => $location?->latitude !== null && $location->longitude !== null
                ? ['latitude' => $location->latitude, 'longitude' => $location->longitude]
                : null,
            ...$this->statusCapabilities($request, $location),
        ]);
    }

    public function update(
        UpdateOrganizationMapRequest $request,
        UpdateOrganizationLocation $update,
    ): RedirectResponse {
        $update->map($request->validatedMap(), $request->user());

        return to_route('system-settings.map.edit')->with('success', 'Map location updated.');
    }

    /** @return array<string, mixed> */
    private function statusCapabilities(Request $request, ?OrganizationLocation $location): array
    {
        $user = $request->user();
        $active = $location !== null && ! $location->trashed();
        $primaryExists = OrganizationLocation::withTrashed()
            ->where('scope', OrganizationLocation::PRIMARY_SCOPE)
            ->exists();

        return [
            'locationId' => $location === null ? null : (int) $location->getKey(),
            'recordStatus' => $location === null ? null : (int) $location->record_status,
            'recordStatusUrl' => $location === null ? null : route('system-settings.organization-locations.record-status', $location->getKey()),
            'deleteUrl' => $active && $user?->can('organization_locations.delete') === true
                ? route('system-settings.organization-locations.destroy', $location->getKey())
                : null,
            'canViewDeleted' => $user?->can('organization_locations.view_deleted') === true,
            'canUpdateDeleted' => $user?->can('organization_locations.update_deleted') === true,
            'canCreate' => ! $primaryExists && $user?->can('organization_locations.create') === true,
            'canUpdate' => $active && $user?->can('organization_locations.update') === true,
            'canDelete' => $user?->can('organization_locations.delete') === true,
            'canUpdateSettings' => $user?->can('settings.update') === true,
        ];
    }
}
