<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\IdleSessionActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SessionActivityController extends Controller
{
    public function __invoke(Request $request): Response
    {
        IdleSessionActivity::queue($request, $request->user());

        return response()->noContent();
    }
}
