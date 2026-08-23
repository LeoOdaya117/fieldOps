<?php

use App\Http\Controllers\Access\AuditController;
use App\Http\Controllers\Access\RoleController;
use App\Http\Controllers\Access\UserController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\Auth\RegistrationController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware('guest')->group(function () {
    Route::get('register', [RegistrationController::class, 'create'])->name('register');
    Route::post('register', [RegistrationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('register.store');
});

Route::get('invitations/{token}', [InvitationController::class, 'show'])->name('invitation.accept');
Route::post('invitations/{token}', [InvitationController::class, 'accept'])
    ->middleware('throttle:6,1')
    ->name('invitation.store');

Route::middleware(['auth', 'verified', 'active'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->middleware('can:dashboard.view')->name('dashboard');

    Route::prefix('access')->name('access.')->group(function () {
        Route::get('users', [UserController::class, 'index'])->middleware('can:users.view')->name('users.index');
        Route::get('users/create', [UserController::class, 'create'])->middleware('can:users.create')->name('users.create');
        Route::post('users', [UserController::class, 'store'])->middleware([RequirePassword::class, 'can:users.create'])->name('users.store');
        Route::get('users/invite', [UserController::class, 'inviteCreate'])->middleware('can:users.invite')->name('users.invite.create');
        Route::get('users/registrations', [UserController::class, 'registrations'])->middleware('can:users.review_registrations')->name('users.registrations.index');
        Route::get('users/registrations/{registration}', [UserController::class, 'reviewRegistration'])->middleware('can:users.review_registrations')->name('users.registrations.show');
        Route::post('users/registrations/{registration}/approve', [UserController::class, 'approveRegistration'])->middleware([RequirePassword::class, 'can:users.review_registrations'])->name('users.registrations.approve');
        Route::post('users/registrations/{registration}/reject', [UserController::class, 'rejectRegistration'])->middleware([RequirePassword::class, 'can:users.review_registrations'])->name('users.registrations.reject');
        Route::get('users/{user}/edit', [UserController::class, 'edit'])->middleware('can:users.update')->name('users.edit');
        Route::patch('users/{user}', [UserController::class, 'update'])->middleware([RequirePassword::class, 'can:users.update'])->name('users.update');
        Route::post('users/invitations', [UserController::class, 'invite'])->middleware([RequirePassword::class, 'can:users.invite'])->name('users.invite');
        Route::post('users/invitations/{invitation}/resend', [UserController::class, 'resendInvitation'])->middleware([RequirePassword::class, 'can:users.invite'])->name('users.invitations.resend');
        Route::delete('users/invitations/{invitation}', [UserController::class, 'revokeInvitation'])->middleware([RequirePassword::class, 'can:users.invite'])->name('users.invitations.revoke');
        Route::patch('users/bulk/suspend', [UserController::class, 'bulkSuspend'])->middleware([RequirePassword::class, 'can:users.suspend'])->name('users.bulk.suspend');
        Route::patch('users/bulk/reactivate', [UserController::class, 'bulkReactivate'])->middleware([RequirePassword::class, 'can:users.update'])->name('users.bulk.reactivate');
        Route::patch('users/{user}/role', [UserController::class, 'assignRole'])->middleware([RequirePassword::class, 'can:roles.assign'])->name('users.role');
        Route::patch('users/{user}/suspend', [UserController::class, 'suspend'])->middleware([RequirePassword::class, 'can:users.suspend'])->name('users.suspend');
        Route::patch('users/{user}/reactivate', [UserController::class, 'reactivate'])->middleware([RequirePassword::class, 'can:users.update'])->name('users.reactivate');

        Route::get('roles', [RoleController::class, 'index'])->middleware('can:roles.view')->name('roles.index');
        Route::get('roles/create', [RoleController::class, 'create'])->middleware('can:roles.create')->name('roles.create');
        Route::post('roles', [RoleController::class, 'store'])->middleware([RequirePassword::class, 'can:roles.create'])->name('roles.store');
        Route::delete('roles/bulk', [RoleController::class, 'bulkDestroy'])->middleware([RequirePassword::class, 'can:roles.delete'])->name('roles.bulk.destroy');
        Route::get('roles/{role}/edit', [RoleController::class, 'edit'])->middleware('can:roles.update')->name('roles.edit');
        Route::patch('roles/{role}', [RoleController::class, 'update'])->middleware([RequirePassword::class, 'can:roles.update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware([RequirePassword::class, 'can:roles.delete'])->name('roles.destroy');

        Route::get('audit', [AuditController::class, 'index'])->middleware('can:audit.view')->name('audit.index');
    });
});

require __DIR__.'/settings.php';
