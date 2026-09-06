<?php

namespace App\Http\Requests\Settings;

use App\Support\SystemSettings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSystemSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->isActive()
            && $user->email_verified_at !== null
            && $user->can('settings.manage_system');
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $timezoneRules = ['required', 'timezone'];

        if (SystemSettings::hasActiveTimezoneCatalog()) {
            $timezoneRules[] = Rule::exists('timezones', 'name')->where(
                static fn ($query) => $query
                    ->where('record_status', 1),
            );
        }

        return [
            'name' => ['required', 'string', 'max:120'],
            'timezone' => $timezoneRules,
            'pagination_size' => ['required', 'integer', Rule::in(SystemSettings::paginationOptions())],
            'idle_timeout_seconds' => ['required', 'integer', 'min:60', 'max:'.SystemSettings::maximumIdleTimeoutSeconds()],
            'login_max_attempts' => ['required', 'integer', 'between:1,20'],
            'login_decay_minutes' => ['required', 'integer', 'between:1,1440'],
        ];
    }

    /**
     * @return array{name: string, timezone: string, pagination_size: int, idle_timeout_seconds: int, login_max_attempts: int, login_decay_minutes: int}
     */
    public function validatedSettings(): array
    {
        $data = $this->validated();

        return [
            'name' => (string) $data['name'],
            'timezone' => (string) $data['timezone'],
            'pagination_size' => (int) $data['pagination_size'],
            'idle_timeout_seconds' => (int) $data['idle_timeout_seconds'],
            'login_max_attempts' => (int) $data['login_max_attempts'],
            'login_decay_minutes' => (int) $data['login_decay_minutes'],
        ];
    }
}
