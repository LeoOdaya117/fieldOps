<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Settings\UpdateOrganizationLocation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateOrganizationAddressRequest;
use App\Models\OrganizationLocation;
use App\Models\PsgcLocality;
use App\Models\PsgcProvince;
use App\Models\PsgcRegion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationAddressController extends Controller
{
    public function edit(Request $request): Response
    {
        $canViewDeleted = $request->user()?->can('organization_locations.view_deleted') === true;
        $query = $canViewDeleted ? OrganizationLocation::withTrashed() : OrganizationLocation::query();
        $location = $query
            ->where('scope', OrganizationLocation::PRIMARY_SCOPE)
            ->first();

        return Inertia::render('settings/system/address', [
            'location' => [
                'region_code' => $location?->region_code,
                'province_code' => $location?->province_code,
                'locality_code' => $location?->locality_code,
            ],
            ...$this->statusCapabilities($request, $location),
            'regions' => PsgcRegion::query()->orderBy('code')->get(['code', 'name']),
            'provinces' => PsgcProvince::query()->orderBy('name')->get(['code', 'region_code', 'name']),
            'localities' => PsgcLocality::query()->orderBy('name')->get([
                'code', 'region_code', 'province_code', 'name', 'type', 'is_independent',
            ]),
        ]);
    }

    public function update(
        UpdateOrganizationAddressRequest $request,
        UpdateOrganizationLocation $update,
    ): RedirectResponse {
        $update->address($request->validatedAddress(), $request->user());

        return to_route('system-settings.address.edit')->with('success', 'Organization address updated.');
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
