<?php

namespace App\Actions\Notifications;

use App\Models\User;
use App\Models\UserRegistration;
use Illuminate\Notifications\DatabaseNotification;

class ReadNotificationInbox
{
    /** @return array<string, mixed> */
    public function item(DatabaseNotification $notification, User $user): array
    {
        $data = $notification->data;
        $registrationId = filter_var(
            $data['registrationId'] ?? null,
            FILTER_VALIDATE_INT,
            FILTER_NULL_ON_FAILURE,
        );
        $url = null;
        if (($data['event'] ?? null) === 'registration.submitted' && $registrationId !== null
            && $user->can('users.review_registrations')
            && UserRegistration::query()->whereKey($registrationId)->exists()) {
            $url = route('access.users.registrations.show', $registrationId, false);
        }

        return [
            'id' => $notification->id,
            'type' => (string) ($data['event'] ?? 'notification'),
            'title' => (string) ($data['title'] ?? 'Notification'),
            'body' => (string) ($data['body'] ?? ''),
            'createdAt' => $notification->created_at?->toIso8601String(),
            'readAt' => $notification->read_at?->toIso8601String(),
            'actionUrl' => $url,
        ];
    }

    /** @return array<string, mixed> */
    public function summary(User $user): array
    {
        return [
            'total' => $user->notifications()->count(),
            'unread' => $user->unreadNotifications()->count(),
            'items' => $user->notifications()->reorder()->orderByDesc('created_at')->orderByDesc('id')->limit(5)->get()
                ->map(fn (DatabaseNotification $notification): array => $this->item($notification, $user))->all(),
        ];
    }
}
