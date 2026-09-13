<?php

namespace App\Http\Requests\Settings;

use App\Support\SystemSettings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePlatformThemeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->isActive()
            && $user->email_verified_at !== null
            && $user->can('settings.manage_system');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'theme' => ['required', 'string', Rule::in(SystemSettings::themeOptions())],
        ];
    }
}
