<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Settings\DeleteOrganizationLocation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\DeleteOrganizationLocationRequest;
use Illuminate\Http\RedirectResponse;

class OrganizationLocationController extends Controller
{
    public function destroy(
        DeleteOrganizationLocationRequest $request,
        int $organizationLocation,
        DeleteOrganizationLocation $delete,
    ): RedirectResponse {
        $delete->execute($organizationLocation, $request->user());

        return to_route('system-settings.address.edit')->with('success', 'Organization location marked inactive.');
    }
}
