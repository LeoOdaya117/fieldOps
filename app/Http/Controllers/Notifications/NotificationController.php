<?php

namespace App\Http\Controllers\Notifications;

use App\Actions\Notifications\ReadNotificationInbox;
use App\Http\Controllers\Controller;
use App\Http\Requests\Notifications\InboxRequest;
use App\Http\Requests\Notifications\UpdateNotificationRequest;
use App\Policies\DatabaseNotificationPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    public function index(InboxRequest $request, ReadNotificationInbox $inbox): Response|RedirectResponse
    {
        $user = $request->user();
        $filter = $request->validated('filter', 'all');
        $query = $user->notifications()->reorder()->orderByDesc('created_at')->orderByDesc('id');
        if ($filter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($filter === 'read') {
            $query->whereNotNull('read_at');
        }

        $page = $query->paginate(20)->withQueryString();
        if ($page->currentPage() > $page->lastPage()) {
            return to_route('notifications.index', ['filter' => $filter, 'page' => $page->lastPage()]);
        }

        return Inertia::render('notifications/index', [
            'inbox' => $page->through(fn (DatabaseNotification $notification): array => $inbox->item($notification, $user)),
            'filter' => $filter,
        ]);
    }

    public function summary(InboxRequest $request, ReadNotificationInbox $inbox): JsonResponse
    {
        return response()->json($inbox->summary($request->user()))->header('Cache-Control', 'private, no-store');
    }

    public function update(UpdateNotificationRequest $request, string $notification): RedirectResponse
    {
        $item = $request->user()->notifications()->findOrFail($notification);
        abort_unless((new DatabaseNotificationPolicy)->update($request->user(), $item), 403);
        if ($request->validated('read')) {
            $request->user()->notifications()->whereKey($item->id)->whereNull('read_at')->update(['read_at' => now()]);
        } else {
            $request->user()->notifications()->whereKey($item->id)->update(['read_at' => null]);
        }

        return back();
    }

    public function readAll(InboxRequest $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }
}
