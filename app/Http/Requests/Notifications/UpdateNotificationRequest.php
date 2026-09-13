<?php

namespace App\Http\Requests\Notifications;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNotificationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() === true && $this->user()->email_verified_at !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['read' => ['required', 'boolean']];
    }
}
