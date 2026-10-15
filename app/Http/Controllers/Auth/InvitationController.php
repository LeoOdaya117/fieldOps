<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Rbac\AcceptInvitation;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AcceptInvitationRequest;
use App\Models\UserInvitation;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class InvitationController extends Controller
{
    public function show(string $token): Response
    {
        $invitation = UserInvitation::query()->with('role')->where('token_hash', UserInvitation::hashToken($token))->first();

        return Inertia::render('auth/accept-invitation', [
            'valid' => $invitation?->isUsable() === true,
            'email' => $invitation?->email,
            'role' => $invitation?->role?->display_name,
            'token' => $token,
        ]);
    }

    public function accept(AcceptInvitationRequest $request, string $token, AcceptInvitation $accept): RedirectResponse
    {
        $invitation = UserInvitation::query()->where('token_hash', UserInvitation::hashToken($token))->firstOrFail();
        $user = $accept->execute($invitation, $request->string('name')->toString(), $request->string('password')->toString());

        auth()->login($user);

        return to_route('dashboard')->with('success', 'Your account is ready.');
    }
}
