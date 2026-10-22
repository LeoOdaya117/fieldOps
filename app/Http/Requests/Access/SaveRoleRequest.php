<?php

namespace App\Http\Requests\Access;

use App\Models\Role;
use App\Support\NavigationCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveRoleRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! array_key_exists('navigation_items', $this->all())) {
            $this->merge(['navigation_items' => []]);
        }

        if (! array_key_exists('custom_navigation_items', $this->all())) {
            $this->merge(['custom_navigation_items' => []]);
        }

        if (! array_key_exists('navigation_group_overrides', $this->all())) {
            $role = $this->route('role');

            $this->merge([
                'navigation_group_overrides' => $role instanceof Role ? $role->navigation_group_overrides : null,
            ]);
        }
    }

    public function authorize(): bool
    {
        if ($this->isMethod('post')) {
            return $this->user()?->can('roles.create') === true;
        }

        $role = $this->route('role');

        return $role instanceof Role && $this->user()?->can('update', $role) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $customKeys = [];
        $customItems = $this->input('custom_navigation_items', []);

        if (is_array($customItems)) {
            foreach ($customItems as $item) {
                if (is_array($item) && is_string($item['key'] ?? null)) {
                    $customKeys[] = $item['key'];
                }
            }
        }

        $allowedKeys = [...app(NavigationCatalog::class)->keys(), ...$customKeys];
        $catalogKeys = app(NavigationCatalog::class)->keys();

        return [
            'name' => [
                'required',
                'string',
                'alpha_dash',
                'min:2',
                'max:80',
                Rule::unique('roles', 'name')->ignore($this->route('role')),
            ],
            'display_name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
            'navigation_items' => ['present', 'array', 'list', 'max:32'],
            'navigation_items.*' => ['required', 'string', 'distinct', Rule::in($allowedKeys)],
            'custom_navigation_items' => ['present', 'array', 'list', 'max:20'],
            'custom_navigation_items.*' => ['required', 'array:key,title,group,url,iconKey'],
            'custom_navigation_items.*.key' => [
                'required',
                'string',
                'distinct',
                'regex:/^custom_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/',
            ],
            'custom_navigation_items.*.title' => ['required', 'string', 'max:100'],
            'custom_navigation_items.*.group' => ['required', 'string', 'max:80'],
            'custom_navigation_items.*.url' => ['required', 'string', 'max:2048', function (string $attribute, mixed $value, $fail): void {
                if (! is_string($value) || ! $this->isSafeCustomUrl($value)) {
                    $fail('The destination URL must be an app path or an HTTPS URL without credentials.');
                }
            }],
            'custom_navigation_items.*.iconKey' => ['required', 'string', Rule::in(app(NavigationCatalog::class)->customIconKeys())],
            'navigation_group_overrides' => [
                'sometimes',
                'nullable',
                'array',
                function (string $attribute, mixed $value, $fail) use ($catalogKeys): void {
                    if (! is_array($value)) {
                        return;
                    }

                    foreach (array_keys($value) as $key) {
                        if (! is_string($key) || ! in_array($key, $catalogKeys, true)) {
                            $fail('Group overrides may only use built-in navigation keys.');
                        }
                    }
                },
            ],
            'navigation_group_overrides.*' => ['required', 'string', 'max:60', 'regex:/\S/u'],
        ];
    }

    private function isSafeCustomUrl(string $url): bool
    {
        if ($url === '' || preg_match('/[\s\x00-\x1F\x7F\\\\]/u', $url) !== 0) {
            return false;
        }

        if (str_starts_with($url, '/') && ! str_starts_with($url, '//')) {
            return true;
        }

        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            return false;
        }

        $parts = parse_url($url);

        return is_array($parts)
            && strtolower((string) ($parts['scheme'] ?? '')) === 'https'
            && is_string($parts['host'] ?? null)
            && $parts['host'] !== ''
            && ! array_key_exists('user', $parts)
            && ! array_key_exists('pass', $parts);
    }
}
