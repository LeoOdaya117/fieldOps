<?php

namespace App\Http\Controllers\Media;

use App\Actions\Media\DeleteMediaAsset;
use App\Actions\Media\StoreFileAsset;
use App\Actions\Media\UpdateFileMetadata;
use App\Http\Controllers\Controller;
use App\Http\Requests\Media\StoreMediaAssetRequest;
use App\Http\Requests\Media\UpdateFileRequest;
use App\Http\Resources\MediaAssetResource;
use App\Models\MediaAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FileController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'module' => ['nullable', 'string', 'in:files,gallery,avatars'],
            'record_status' => ['nullable', 'string', 'in:active,inactive'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'in:25,50,75,100'],
        ]);
        $actor = $request->user();
        $admin = $actor->hasAnyRole(['admin', 'super_admin']);
        $search = trim((string) ($filters['search'] ?? ''));
        $status = (string) ($filters['record_status'] ?? 'active');
        $module = (string) ($filters['module'] ?? '');
        $perPage = (int) ($filters['per_page'] ?? 50);

        $files = MediaAsset::withTrashed()
            ->withCount(['platformAssignments', 'usersUsingAsAvatar'])
            ->where(static function ($query) use ($actor, $admin, $status): void {
                if ($actor->can('files.view')) {
                    $query->orWhere(static function ($query) use ($actor, $admin, $status): void {
                        $query->where('module', 'files');
                        if (! $admin) {
                            $query->where('uploader_id', $actor->getKey());
                        }
                        if ($status === 'inactive' && ! $actor->can('files.view_deleted')) {
                            $query->whereRaw('1 = 0');
                        }
                    });
                }
                if ($actor->can('media_assets.view')) {
                    $query->orWhere(static function ($query) use ($actor, $admin, $status): void {
                        $query->where('module', 'gallery');
                        if (! $admin) {
                            $query->where('uploader_id', $actor->getKey());
                        }
                        if ($status === 'inactive' && ! $actor->can('media_assets.view_deleted')) {
                            $query->whereRaw('1 = 0');
                        }
                    });
                }
                if ($status !== 'inactive' || $actor->can('users.view_deleted')) {
                    if ($actor->can('users.view')) {
                        $query->orWhere('module', 'avatars');
                    } else {
                        $query->orWhere(static fn ($query) => $query->where('module', 'avatars')->where('uploader_id', $actor->getKey()));
                    }
                }
            })
            ->where('record_status', $status === 'inactive' ? 0 : 1)
            ->when($module !== '', static fn ($query) => $query->where('module', $module))
            ->when($search !== '', static fn ($query) => $query->where(static fn ($query) => $query->where('original_name', 'like', '%'.$search.'%')->orWhere('tag', 'like', '%'.$search.'%')))
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString()
            ->through(static fn (MediaAsset $asset): array => (new MediaAssetResource($asset))->toArray($request));

        return Inertia::render('files/index', [
            'files' => $files,
            'filters' => ['search' => $search, 'module' => $module, 'record_status' => $status, 'per_page' => $perPage],
            'canCreate' => $actor->can('files.create'),
            'canViewDeleted' => $actor->can('files.view_deleted') || $actor->can('media_assets.view_deleted'),
            'canUpdateDeleted' => $actor->can('files.update_deleted') || $actor->can('media_assets.update_deleted'),
        ]);
    }

    public function show(Request $request, string $token): Response
    {
        $asset = MediaAsset::withTrashed()->withCount(['platformAssignments', 'usersUsingAsAvatar'])->where('token', $token)->firstOrFail();
        $this->authorize('view', $asset);

        return Inertia::render('files/show', [
            'file' => (new MediaAssetResource($asset))->toArray($request),
            'canViewDeleted' => $request->user()->can(match ($asset->module) {
                'files' => 'files.view_deleted',
                'avatars' => 'users.view_deleted',
                default => 'media_assets.view_deleted',
            }),
            'canUpdateDeleted' => $asset->module !== 'avatars' && $request->user()->can('updateDeleted', $asset),
        ]);
    }

    public function store(StoreMediaAssetRequest $request, StoreFileAsset $store): JsonResponse
    {
        $asset = $store->execute($request->file('file'), $request->user(), $request->validated('tag'));
        $asset->loadCount(['platformAssignments', 'usersUsingAsAvatar']);

        return (new MediaAssetResource($asset))->response()->setStatusCode(201);
    }

    public function update(UpdateFileRequest $request, string $token, UpdateFileMetadata $update): JsonResponse
    {
        $asset = MediaAsset::query()->where('token', $token)->where('module', 'files')->firstOrFail();
        $this->authorize('update', $asset);
        $tag = $request->validated('tag');
        $asset = $update->execute(
            $asset,
            (string) $request->validated('name'),
            is_string($tag) ? $tag : null,
            $request->user(),
        );
        $asset->loadCount(['platformAssignments', 'usersUsingAsAvatar']);

        return (new MediaAssetResource($asset))->response();
    }

    public function destroy(Request $request, string $token, DeleteMediaAsset $delete): JsonResponse
    {
        $asset = MediaAsset::query()->where('token', $token)->where('module', 'files')->firstOrFail();
        $this->authorize('delete', $asset);
        $delete->execute($asset, $request->user());

        return response()->json(null, 204);
    }
}
