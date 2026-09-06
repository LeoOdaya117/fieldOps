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
use Inertia\Inertia;
use Inertia\Response;

class OrganizationAddressController extends Controller
{
    public function edit(): Response
    {
        $location = OrganizationLocation::query()
            ->where('scope', OrganizationLocation::PRIMARY_SCOPE)
            ->first();

        return Inertia::render('settings/system/address', [
            'location' => [
                'region_code' => $location?->region_code,
                'province_code' => $location?->province_code,
                'locality_code' => $location?->locality_code,
            ],
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
}
