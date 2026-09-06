<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Settings\AssignPlatformImage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\AssignPlatformImageRequest;
use App\Models\MediaAsset;
use App\Models\PlatformImageAssignment;
use App\Support\PlatformBranding;
use App\Support\PlatformImageRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PlatformImageController extends Controller
{
    public function index(Request $request): Response
    {
        $assignments = PlatformImageAssignment::query()->with('asset')->get()->keyBy('slot');
        $branding = PlatformBranding::values();
        $slots = [];

        foreach (PlatformImageRegistry::slots() as $slot => $definition) {
            $asset = $assignments->get($slot)?->asset;
            $slots[] = [
                'key' => $slot,
                ...$definition,
                'url' => $branding[$slot]['url'],
                'isCustom' => $branding[$slot]['is_custom'],
                'asset' => $asset === null ? null : [
                    'id' => $asset->getKey(),
                    'name' => $asset->original_name,
                    'mimeType' => $asset->mime_type,
                    'sizeBytes' => $asset->size_bytes,
                    'width' => $asset->width,
                    'height' => $asset->height,
                    'source' => $asset->source,
                    'createdAt' => $asset->created_at?->toIso8601String(),
                ],
            ];
        }

        return Inertia::render('settings/system/platform-images', [
            'slots' => $slots,
            'canAssign' => $request->user()->isOwner(),
        ]);
    }

    public function update(
        AssignPlatformImageRequest $request,
        string $slot,
        AssignPlatformImage $assign,
    ): RedirectResponse {
        $asset = MediaAsset::query()->findOrFail((int) $request->validated('asset_id'));
        $assign->assign($slot, $asset, $request->user());

        return to_route('system-settings.platform-images.index')
            ->with('success', 'Platform image updated.');
    }

    public function destroy(Request $request, string $slot, AssignPlatformImage $assign): RedirectResponse
    {
        abort_unless(
            $request->user()->isActive()
                && $request->user()->email_verified_at !== null
                && $request->user()->isOwner(),
            403,
        );
        $assign->reset($slot, $request->user());

        return to_route('system-settings.platform-images.index')
            ->with('success', 'Platform image reset to its built-in default.');
    }
}
