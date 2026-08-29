<?php

namespace App\Notifications;

use App\Models\UserInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserInvitationNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly string $token) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(UserInvitation $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('You have been invited to FieldOps')
            ->greeting('You have been invited to FieldOps.')
            ->line('Create your account to access the FieldOps workspace.')
            ->action('Accept invitation', route('invitation.accept', ['token' => $this->token]))
            ->line('This invitation expires in seven days and can only be used once.');
    }
}
