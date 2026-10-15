<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Rbac\SubmitRegistration;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\StoreRegistrationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class RegistrationController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    public function store(StoreRegistrationRequest $request, SubmitRegistration $submit): RedirectResponse
    {
        $submit->execute($request->validated());

        return to_route('register')->with('success', 'Registration submitted. An administrator must approve your account before you can sign in.');
    }
}
