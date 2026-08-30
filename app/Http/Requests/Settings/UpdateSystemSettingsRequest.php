<?php

namespace App\Http\Requests\Settings;

use App\Support\SystemSettings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSystemSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('settings.manage_system') === true;
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
        ];
    }

    /**
     * @return array{name: string, timezone: string, pagination_size: int}
     */
    public function validatedSettings(): array
    {
        $data = $this->validated();

        return [
            'name' => (string) $data['name'],
            'timezone' => (string) $data['timezone'],
            'pagination_size' => (int) $data['pagination_size'],
        ];
    }
}
