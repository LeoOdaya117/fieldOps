<?php

namespace App\Http\Controllers\RecordStatus;

use App\Actions\RecordStatus\ChangeRecordStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecordStatus\UpdateRecordStatusRequest;
use App\Models\BlockedIpAddress;
use App\Models\Country;
use App\Models\MediaAsset;
use App\Models\OrganizationLocation;
use App\Models\Role;
use App\Models\Timezone;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Http\RedirectResponse;

class RecordStatusController extends Controller
{
    public function user(UpdateRecordStatusRequest $request, int $user, ChangeRecordStatus $change): RedirectResponse
    {
        $change->execute(User::class, $user, (int) $request->validated('record_status'), $request->user());

        return back()->with('success', 'User record status updated.');
    }

    public function invitation(UpdateRecordStatusRequest $request, int $invitation, ChangeRecordStatus $change): RedirectResponse
    {
        $change->execute(UserInvitation::class, $invitation, (int) $request->validated('record_status'), $request->user());

        return back()->with('success', 'Invitation record status updated.');
    }

    public function role(UpdateRecordStatusRequest $request, int $role, ChangeRecordStatus $change): RedirectResponse
    {
        $change->execute(Role::class, $role, (int) $request->validated('record_status'), $request->user());

        return back()->with('success', 'Role record status updated.');
    }

    public function ipBlock(UpdateRecordStatusRequest $request, int $blockedIpAddress, ChangeRecordStatus $change): RedirectResponse
    {
        $change->execute(BlockedIpAddress::class, $blockedIpAddress, (int) $request->validated('record_status'), $request->user());

        return back()->with('success', 'IP block record status updated.');
    }

    public function country(UpdateRecordStatusRequest $request, int $country, ChangeRecordStatus $change): RedirectResponse
    {
        $change->execute(Country::class, $country, (int) $request->validated('record_status'), $request->user());

        return back()->with('success', 'Country record status updated.');
    }

    public function timezone(UpdateRecordStatusRequest $request, int $timezone, ChangeRecordStatus $change): RedirectResponse
    {
        $change->execute(Timezone::class, $timezone, (int) $request->validated('record_status'), $request->user());

        return back()->with('success', 'Timezone record status updated.');
    }

    public function organizationLocation(
        UpdateRecordStatusRequest $request,
        int $organizationLocation,
        ChangeRecordStatus $change,
    ): RedirectResponse {
        $change->execute(OrganizationLocation::class, $organizationLocation, (int) $request->validated('record_status'), $request->user());

        return back()->with('success', 'Organization location status updated.');
    }

    public function mediaAsset(
        UpdateRecordStatusRequest $request,
        string $token,
        ChangeRecordStatus $change,
    ): RedirectResponse {
        $asset = MediaAsset::withTrashed()->where('token', $token)->firstOrFail();
        $this->authorize('updateDeleted', $asset);
        $change->execute(MediaAsset::class, $asset->getKey(), (int) $request->validated('record_status'), $request->user());

        return back()->with('success', 'Media asset status updated.');
    }
}
