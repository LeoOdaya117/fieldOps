<?php

namespace App\Http\Requests\Notifications;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InboxRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isActive() === true && $this->user()->email_verified_at !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['filter' => ['sometimes', Rule::in(['all', 'unread', 'read'])], 'page' => ['sometimes', 'integer', 'min:1', 'max:100000']];
    }
}
