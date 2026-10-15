<?php

use App\Http\Controllers\Backups\BackupController;
use App\Http\Controllers\RecordStatus\RecordStatusController;
use App\Http\Controllers\Settings\OrganizationAddressController;
use App\Http\Controllers\Settings\OrganizationLocationController;
use App\Http\Controllers\Settings\OrganizationMapController;
use App\Http\Controllers\Settings\PlatformImageController;
use App\Http\Controllers\Settings\PlatformLayoutController;
use App\Http\Controllers\Settings\ProfileController;
/* @chisel-password-confirmation */
use App\Http\Controllers\Settings\SecurityController;
/* @end-chisel-password-confirmation */
use App\Http\Controllers\Settings\SystemSettingsController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'active'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');

    Route::get('settings/system', [SystemSettingsController::class, 'edit'])
        ->middleware(['verified', 'can:settings.view'])
        ->name('system-settings.edit');
    Route::patch('settings/system', [SystemSettingsController::class, 'update'])
        ->middleware(['verified', 'can:settings.update', RequirePassword::class])
        ->name('system-settings.update');

    Route::prefix('settings/system/backups')->name('system-settings.backups.')
        ->middleware(['verified', 'backup-admin'])->group(function (): void {
            Route::get('/', [BackupController::class, 'index'])->name('index');
            Route::get('/status', [BackupController::class, 'index'])->middleware('throttle:60,1')->name('status');
            Route::get('/create', [BackupController::class, 'create'])->name('create');
            Route::get('/audit', [BackupController::class, 'audit'])->name('audit');
            Route::get('/tables', [BackupController::class, 'tables'])->middleware('throttle:30,1')->name('tables');
            Route::get('/{backup}', [BackupController::class, 'show'])->whereUuid('backup')->name('show');
            Route::middleware([RequirePassword::class, 'throttle:6,1'])->group(function (): void {
                Route::post('/', [BackupController::class, 'store'])->name('store');
                Route::post('/upload', [BackupController::class, 'upload'])->name('upload');
                Route::get('/{backup}/download', [BackupController::class, 'download'])->whereUuid('backup')->name('download');
                Route::delete('/{backup}', [BackupController::class, 'destroy'])->whereUuid('backup')->name('destroy');
                Route::post('/{backup}/restore', [BackupController::class, 'restore'])->whereUuid('backup')->name('restore');
            });
        });

    Route::get('settings/system/layout', [PlatformLayoutController::class, 'edit'])
        ->middleware(['verified', 'can:settings.view'])
        ->name('system-settings.layout.edit');
    Route::patch('settings/system/layout', [PlatformLayoutController::class, 'update'])
        ->middleware(['verified', 'can:settings.update', RequirePassword::class])
        ->name('system-settings.layout.update');

    Route::get('settings/system/address', [OrganizationAddressController::class, 'edit'])
        ->middleware(['verified', 'can:settings.view', 'can:organization_locations.view'])
        ->name('system-settings.address.edit');
    Route::patch('settings/system/address', [OrganizationAddressController::class, 'update'])
        ->middleware(['verified', 'can:settings.update', RequirePassword::class])
        ->name('system-settings.address.update');

    Route::get('settings/system/map', [OrganizationMapController::class, 'edit'])
        ->middleware(['verified', 'can:settings.view', 'can:organization_locations.view'])
        ->name('system-settings.map.edit');
    Route::patch('settings/system/map', [OrganizationMapController::class, 'update'])
        ->middleware(['verified', 'can:settings.update', RequirePassword::class])
        ->name('system-settings.map.update');

    Route::get('settings/system/platform-images', [PlatformImageController::class, 'index'])
        ->middleware(['verified', 'can:settings.view'])
        ->name('system-settings.platform-images.index');
    Route::put('settings/system/platform-images/{slot}', [PlatformImageController::class, 'update'])
        ->middleware(['verified', 'can:settings.update', RequirePassword::class])
        ->name('system-settings.platform-images.update');
    Route::delete('settings/system/platform-images/{slot}', [PlatformImageController::class, 'destroy'])
        ->middleware(['verified', 'can:settings.update', RequirePassword::class])
        ->name('system-settings.platform-images.destroy');

    Route::patch('settings/system/organization-locations/{organizationLocation}/record-status', [RecordStatusController::class, 'organizationLocation'])
        ->middleware(['verified', 'can:organization_locations.update_deleted'])
        ->name('system-settings.organization-locations.record-status');
    Route::delete('settings/system/organization-locations/{organizationLocation}', [OrganizationLocationController::class, 'destroy'])
        ->middleware(['verified', 'can:settings.update', 'can:organization_locations.delete', RequirePassword::class])
        ->name('system-settings.organization-locations.destroy');
});

Route::middleware(['auth', 'verified', 'active'])->group(function () {
    Route::get('settings/security', [SecurityController::class, 'edit'])
        /* @chisel-password-confirmation */
        ->middleware(RequirePassword::class)
        /* @end-chisel-password-confirmation */
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});

/* @chisel-passkeys */
Route::get('.well-known/passkey-endpoints', function () {
    return response()->json([
        'enroll' => route('security.edit'),
        'manage' => route('security.edit'),
    ]);
})->name('well-known.passkeys');
/* @end-chisel-passkeys */
