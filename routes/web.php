<?php

use App\Http\Controllers\Access\AuditController;
use App\Http\Controllers\Access\BlockedIpAddressController;
use App\Http\Controllers\Access\RoleController;
use App\Http\Controllers\Access\UserController;
use App\Http\Controllers\Access\VisitLogController;
use App\Http\Controllers\Auth\InvitationController;
use App\Http\Controllers\Auth\RegistrationController;
use App\Http\Controllers\Auth\SessionActivityController;
use App\Http\Controllers\Exports\ExportController;
use App\Http\Controllers\Media\FileController;
use App\Http\Controllers\Media\MediaAssetContentController;
use App\Http\Controllers\Media\MediaAssetController;
use App\Http\Controllers\Media\PlatformAssetContentController;
use App\Http\Controllers\Notifications\NotificationController;
use App\Http\Controllers\RecordStatus\RecordStatusController;
use App\Http\Controllers\System\CountryController;
use App\Http\Controllers\System\TimezoneController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');
Route::get('platform-assets/{slot}/{token}', PlatformAssetContentController::class)->name('platform-assets.show');

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
    Route::post('exports/{dataset}/{format}', [ExportController::class, 'store'])
        ->whereIn('dataset', ['users', 'invitations', 'registrations', 'roles', 'audit', 'ip-blocks', 'visit-logs', 'files', 'countries', 'timezones'])
        ->whereIn('format', ['pdf', 'csv', 'xlsx', 'print'])
        ->middleware('throttle:exports')
        ->name('exports.store');
    Route::get('exports/{artifact}/download', [ExportController::class, 'download'])->whereUuid('artifact')->name('exports.artifacts.download');
    Route::get('exports/{artifact}/print', [ExportController::class, 'print'])->whereUuid('artifact')->name('exports.artifacts.print');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/summary', [NotificationController::class, 'summary'])->name('notifications.summary');
    Route::patch('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::patch('notifications/{notification}', [NotificationController::class, 'update'])->whereUuid('notification')->name('notifications.update');

    Route::post('session/activity', SessionActivityController::class)->name('session.activity');
    Route::get('files', [FileController::class, 'index'])->middleware('can:files.view')->name('files.index');
    Route::post('files', [FileController::class, 'store'])->middleware(['can:files.create', 'throttle:media-uploads'])->name('files.store');
    Route::get('files/{token}/content', [MediaAssetContentController::class, 'content'])->name('files.content');
    Route::get('files/{token}/thumbnail', [MediaAssetContentController::class, 'thumbnail'])->name('files.thumbnail');
    Route::get('files/{token}/preview-data', [MediaAssetContentController::class, 'previewData'])->middleware('throttle:file-previews')->name('files.preview-data');
    Route::get('files/{token}/download', [MediaAssetContentController::class, 'download'])->name('files.download');
    Route::patch('files/{token}/record-status', [RecordStatusController::class, 'mediaAsset'])->name('files.record-status');
    Route::patch('files/{token}', [FileController::class, 'update'])->middleware('can:files.update')->name('files.update');
    Route::delete('files/{token}', [FileController::class, 'destroy'])->middleware('can:files.delete')->name('files.destroy');
    Route::get('files/{token}', [FileController::class, 'show'])->name('files.show');
    Route::get('media-assets', [MediaAssetController::class, 'index'])->middleware('can:media_assets.view')->name('media-assets.index');
    Route::post('media-assets', [MediaAssetController::class, 'store'])
        ->middleware(['can:media_assets.create', 'throttle:media-uploads'])
        ->name('media-assets.store');
    Route::patch('media-assets/{asset}', [MediaAssetController::class, 'update'])
        ->middleware('can:media_assets.update')
        ->name('media-assets.update');
    Route::delete('media-assets/{asset}', [MediaAssetController::class, 'destroy'])
        ->middleware('can:media_assets.delete')
        ->name('media-assets.destroy');

    Route::inertia('dashboard', 'dashboard')->middleware('can:dashboard.view')->name('dashboard');

    Route::prefix('access')->name('access.')->group(function () {
        Route::get('users', [UserController::class, 'index'])->middleware('can:users.view')->name('users.index');
        Route::patch('users/{user}/record-status', [RecordStatusController::class, 'user'])->middleware('can:users.update_deleted')->name('users.record-status');
        Route::patch('users/invitations/{invitation}/record-status', [RecordStatusController::class, 'invitation'])->middleware('can:users.update_deleted')->name('users.invitations.record-status');
        Route::get('users/create', [UserController::class, 'create'])->middleware('can:users.create')->name('users.create');
        Route::post('users', [UserController::class, 'store'])->middleware([RequirePassword::class, 'can:users.create'])->name('users.store');
        Route::get('users/invite', [UserController::class, 'inviteCreate'])->middleware('can:users.invite')->name('users.invite.create');
        Route::get('users/registrations', [UserController::class, 'registrations'])->middleware('can:users.review_registrations')->name('users.registrations.index');
        Route::get('users/registrations/{registration}', [UserController::class, 'reviewRegistration'])->middleware('can:users.review_registrations')->name('users.registrations.show');
        Route::post('users/registrations/{registration}/approve', [UserController::class, 'approveRegistration'])->middleware([RequirePassword::class, 'can:users.review_registrations'])->name('users.registrations.approve');
        Route::post('users/registrations/{registration}/reject', [UserController::class, 'rejectRegistration'])->middleware([RequirePassword::class, 'can:users.review_registrations'])->name('users.registrations.reject');
        Route::get('users/{user}/edit', [UserController::class, 'edit'])->middleware('can:users.update')->name('users.edit');
        Route::patch('users/{user}', [UserController::class, 'update'])->middleware([RequirePassword::class, 'can:users.update'])->name('users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware([RequirePassword::class, 'can:users.delete'])->name('users.destroy');
        Route::post('users/invitations', [UserController::class, 'invite'])->middleware([RequirePassword::class, 'can:users.invite'])->name('users.invite');
        Route::post('users/invitations/{invitation}/resend', [UserController::class, 'resendInvitation'])->middleware([RequirePassword::class, 'can:users.invite'])->name('users.invitations.resend');
        Route::delete('users/invitations/{invitation}', [UserController::class, 'revokeInvitation'])->middleware([RequirePassword::class, 'can:users.invite'])->name('users.invitations.revoke');
        Route::patch('users/bulk/suspend', [UserController::class, 'bulkSuspend'])->middleware([RequirePassword::class, 'can:users.suspend'])->name('users.bulk.suspend');
        Route::patch('users/bulk/reactivate', [UserController::class, 'bulkReactivate'])->middleware([RequirePassword::class, 'can:users.update'])->name('users.bulk.reactivate');
        Route::patch('users/{user}/role', [UserController::class, 'assignRole'])->middleware([RequirePassword::class, 'can:roles.assign'])->name('users.role');
        Route::patch('users/{user}/suspend', [UserController::class, 'suspend'])->middleware([RequirePassword::class, 'can:users.suspend'])->name('users.suspend');
        Route::patch('users/{user}/reactivate', [UserController::class, 'reactivate'])->middleware([RequirePassword::class, 'can:users.update'])->name('users.reactivate');
        Route::get('users/{user}', [UserController::class, 'show'])->middleware('can:users.view')->name('users.show');

        Route::get('roles', [RoleController::class, 'index'])->middleware('can:roles.view')->name('roles.index');
        Route::patch('roles/{role}/record-status', [RecordStatusController::class, 'role'])->middleware('can:roles.update_deleted')->name('roles.record-status');
        Route::get('roles/create', [RoleController::class, 'create'])->middleware('can:roles.create')->name('roles.create');
        Route::post('roles', [RoleController::class, 'store'])->middleware([RequirePassword::class, 'can:roles.create'])->name('roles.store');
        Route::delete('roles/bulk', [RoleController::class, 'bulkDestroy'])->middleware([RequirePassword::class, 'can:roles.delete'])->name('roles.bulk.destroy');
        Route::get('roles/{role}', [RoleController::class, 'show'])->middleware('can:roles.view')->name('roles.show');
        Route::get('roles/{role}/edit', [RoleController::class, 'edit'])->middleware('can:roles.update')->name('roles.edit');
        Route::patch('roles/{role}', [RoleController::class, 'update'])->middleware([RequirePassword::class, 'can:roles.update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware([RequirePassword::class, 'can:roles.delete'])->name('roles.destroy');

        Route::get('audit', [AuditController::class, 'index'])->middleware('can:audit.view')->name('audit.index');
        Route::get('audit/{accessAuditEvent}', [AuditController::class, 'show'])->middleware('can:audit.view')->name('audit.show');
        Route::get('ip-blocks', [BlockedIpAddressController::class, 'index'])->middleware('can:ip_blocks.view')->name('ip-blocks.index');
        Route::patch('ip-blocks/{blockedIpAddress}/record-status', [RecordStatusController::class, 'ipBlock'])->middleware('can:ip_blocks.update_deleted')->name('ip-blocks.record-status');
        Route::get('ip-blocks/create', [BlockedIpAddressController::class, 'create'])->middleware('can:ip_blocks.create')->name('ip-blocks.create');
        Route::post('ip-blocks', [BlockedIpAddressController::class, 'store'])->middleware([RequirePassword::class, 'can:ip_blocks.create'])->name('ip-blocks.store');
        Route::get('ip-blocks/{blockedIpAddress}', [BlockedIpAddressController::class, 'show'])->middleware('can:ip_blocks.view')->name('ip-blocks.show');
        Route::get('ip-blocks/{blockedIpAddress}/edit', [BlockedIpAddressController::class, 'edit'])->middleware('can:ip_blocks.update')->name('ip-blocks.edit');
        Route::delete('ip-blocks/{blockedIpAddress}', [BlockedIpAddressController::class, 'destroy'])->middleware([RequirePassword::class, 'can:ip_blocks.delete'])->name('ip-blocks.destroy');
        Route::patch('ip-blocks/{blockedIpAddress}', [BlockedIpAddressController::class, 'update'])->middleware([RequirePassword::class, 'can:ip_blocks.update'])->name('ip-blocks.update');
        Route::patch('ip-blocks/{blockedIpAddress}/activate', [BlockedIpAddressController::class, 'activate'])->middleware([RequirePassword::class, 'can:ip_blocks.update'])->name('ip-blocks.activate');
        Route::patch('ip-blocks/{blockedIpAddress}/deactivate', [BlockedIpAddressController::class, 'deactivate'])->middleware([RequirePassword::class, 'can:ip_blocks.update'])->name('ip-blocks.deactivate');
        Route::get('visit-logs', [VisitLogController::class, 'index'])->middleware('can:visit_logs.view')->name('visit-logs.index');
        Route::get('visit-logs/{visitLog}', [VisitLogController::class, 'show'])->middleware('can:visit_logs.view')->name('visit-logs.show');
    });

    Route::prefix('system')->name('system.')->group(function () {
        Route::get('countries', [CountryController::class, 'index'])->middleware('can:countries.view')->name('countries.index');
        Route::patch('countries/{country}/record-status', [RecordStatusController::class, 'country'])->middleware('can:countries.update_deleted')->name('countries.record-status');
        Route::get('countries/create', [CountryController::class, 'create'])->middleware('can:countries.create')->name('countries.create');
        Route::post('countries', [CountryController::class, 'store'])->middleware([RequirePassword::class, 'can:countries.create'])->name('countries.store');
        Route::get('countries/{country}/edit', [CountryController::class, 'edit'])->middleware('can:countries.update')->name('countries.edit');
        Route::get('countries/{country}', [CountryController::class, 'show'])->middleware('can:countries.view')->name('countries.show');
        Route::patch('countries/{country}', [CountryController::class, 'update'])->middleware([RequirePassword::class, 'can:countries.update'])->name('countries.update');
        Route::delete('countries/{country}', [CountryController::class, 'destroy'])->middleware([RequirePassword::class, 'can:countries.delete'])->name('countries.destroy');

        Route::get('timezones', [TimezoneController::class, 'index'])->middleware('can:timezones.view')->name('timezones.index');
        Route::patch('timezones/{timezone}/record-status', [RecordStatusController::class, 'timezone'])->middleware('can:timezones.update_deleted')->name('timezones.record-status');
        Route::get('timezones/create', [TimezoneController::class, 'create'])->middleware('can:timezones.create')->name('timezones.create');
        Route::post('timezones', [TimezoneController::class, 'store'])->middleware([RequirePassword::class, 'can:timezones.create'])->name('timezones.store');
        Route::get('timezones/{timezone}/edit', [TimezoneController::class, 'edit'])->middleware('can:timezones.update')->name('timezones.edit');
        Route::get('timezones/{timezone}', [TimezoneController::class, 'show'])->middleware('can:timezones.view')->name('timezones.show');
        Route::patch('timezones/{timezone}', [TimezoneController::class, 'update'])->middleware([RequirePassword::class, 'can:timezones.update'])->name('timezones.update');
        Route::delete('timezones/{timezone}', [TimezoneController::class, 'destroy'])->middleware([RequirePassword::class, 'can:timezones.delete'])->name('timezones.destroy');
    });
});

require __DIR__.'/settings.php';
