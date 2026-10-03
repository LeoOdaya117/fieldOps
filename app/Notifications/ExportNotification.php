<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

class ExportNotification extends Notification
{
    public function __construct(
        public readonly string $event,
        public readonly string $title,
        public readonly string $body,
        public readonly string $artifactId,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toDatabase(object $notifiable): array
    {
        return [
            'event' => $this->event,
            'title' => $this->title,
            'body' => $this->body,
            'exportArtifactId' => $this->artifactId,
        ];
    }
}
