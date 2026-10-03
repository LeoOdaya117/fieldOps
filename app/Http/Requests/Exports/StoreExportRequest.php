<?php

namespace App\Http\Requests\Exports;

use App\Actions\Exports\ExportDatasetRegistry;
use DateTimeZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreExportRequest extends FormRequest
{
    /** @var array<string, list<string>> */
    private const array FILTER_KEYS = [
        'users' => ['search', 'status', 'record_status', 'from', 'to', 'sort', 'direction', 'page', 'per_page'],
        'invitations' => ['record_status', 'invitation_sort', 'invitation_direction', 'sort', 'direction'],
        'registrations' => ['sort', 'direction'],
        'roles' => ['search', 'type', 'assigned', 'record_status', 'permissions_min', 'from', 'to', 'sort', 'direction', 'page', 'per_page'],
        'audit' => ['event', 'actor', 'subject', 'from', 'to', 'sort', 'direction', 'page', 'per_page'],
        'ip-blocks' => ['search', 'status', 'record_status', 'from', 'to', 'sort', 'direction', 'page', 'per_page'],
        'visit-logs' => ['keyword', 'event', 'outcome', 'status_code', 'from', 'to', 'sort', 'direction', 'page', 'per_page'],
        'files' => ['search', 'module', 'record_status', 'page', 'per_page'],
        'countries' => ['search', 'record_status', 'from', 'to', 'sort', 'direction', 'page', 'per_page'],
        'timezones' => ['search', 'record_status', 'from', 'to', 'sort', 'direction', 'page', 'per_page'],
    ];

    public function authorize(): bool
    {
        $dataset = (string) $this->route('dataset');
        $format = (string) $this->route('format');

        return $this->user() !== null && app(ExportDatasetRegistry::class)->canExport($this->user(), $dataset, $format);
    }

    protected function prepareForValidation(): void
    {
        $dataset = (string) $this->route('dataset');
        $allowed = self::FILTER_KEYS[$dataset] ?? [];
        $incoming = $this->input('filters', []);
        $incoming = is_array($incoming) ? $incoming : [];
        $aliases = [
            'recordStatus' => 'record_status', 'perPage' => 'per_page', 'statusCode' => 'status_code',
            'permissionsMin' => 'permissions_min', 'invitationSort' => 'invitation_sort', 'invitationDirection' => 'invitation_direction',
        ];
        $filters = [];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $incoming)) {
                $filters[$key] = $incoming[$key];
            }
        }
        foreach ($aliases as $alias => $key) {
            if (in_array($key, $allowed, true) && ! array_key_exists($key, $filters) && array_key_exists($alias, $incoming)) {
                $filters[$key] = $incoming[$alias];
            }
        }
        $this->merge(['filters' => $filters]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $dataset = (string) $this->route('dataset');
        $allowed = self::FILTER_KEYS[$dataset] ?? [];
        $rules = [
            'filters' => ['sometimes', 'array:'.implode(',', $allowed)],
            'filters.search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'filters.keyword' => ['sometimes', 'nullable', 'string', 'max:100'],
            'filters.actor' => ['sometimes', 'nullable', 'string', 'max:100'],
            'filters.subject' => ['sometimes', 'nullable', 'string', 'max:100'],
            'filters.from' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'filters.to' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'filters.sort' => ['sometimes', 'nullable', 'string', 'max:40'],
            'filters.direction' => ['sometimes', 'nullable', Rule::in(['asc', 'desc'])],
            'filters.invitation_sort' => ['sometimes', 'nullable', 'string', Rule::in(['status', 'created_at', 'updated_at', 'record_status', 'created_by', 'updated_by'])],
            'filters.invitation_direction' => ['sometimes', 'nullable', Rule::in(['asc', 'desc'])],
            'filters.status' => ['sometimes', 'nullable', $this->allowedList($dataset === 'ip-blocks' ? ['active', 'inactive'] : ['active', 'suspended'])],
            'filters.record_status' => ['sometimes', 'nullable', $this->allowedList(['active', 'inactive'])],
            'filters.type' => ['sometimes', 'nullable', $this->allowedList(['system', 'custom'])],
            'filters.assigned' => ['sometimes', 'nullable', $this->allowedList(['assigned', 'unassigned'])],
            'filters.event' => ['sometimes', 'nullable', $this->boundedStrings(50, 100)],
            'filters.event.*' => ['string', 'max:100'],
            'filters.outcome' => ['sometimes', 'nullable', $this->allowedList(['success'])],
            'filters.status_code' => ['sometimes', 'nullable', 'integer', 'between:100,599'],
            'filters.permissions_min' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10000'],
            'filters.module' => ['sometimes', 'nullable', Rule::in(['files', 'gallery', 'avatars'])],
            'filters.page' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100000'],
            'filters.per_page' => ['sometimes', 'nullable', 'integer', 'in:25,50,75,100'],
        ];

        $format = (string) $this->route('format');
        if (in_array($format, ['pdf', 'print'], true) && in_array($dataset, ExportDatasetRegistry::DATASETS, true)) {
            $keys = array_keys(app(ExportDatasetRegistry::class)->reportColumnMap($dataset));
            $rules['columns'] = ['sometimes', 'required', 'array', 'list', 'min:1', 'max:'.count($keys)];
            $rules['columns.*'] = ['required', 'string', 'distinct:strict', Rule::in($keys)];
            $rules['timezone'] = ['sometimes', 'required', 'string', 'max:64', Rule::in(DateTimeZone::listIdentifiers(DateTimeZone::ALL_WITH_BC))];
            $rules['locale'] = ['sometimes', 'required', 'string', 'max:35', 'regex:/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/D'];
        } else {
            $rules['columns'] = ['missing'];
            $rules['timezone'] = ['missing'];
            $rules['locale'] = ['missing'];
        }

        if ($dataset === 'visit-logs') {
            $rules['filters.event'] = ['sometimes', 'nullable', $this->allowedList(['login', 'logout'])];
        }

        return array_intersect_key($rules, array_flip([
            'filters', ...array_map(static fn (string $key): string => 'filters.'.$key, $allowed),
            'filters.event.*', 'columns', 'columns.*', 'timezone', 'locale',
        ]));
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $filters = $this->input('filters', []);
            if (is_array($filters) && is_string($filters['from'] ?? null) && is_string($filters['to'] ?? null)
                && $filters['from'] !== '' && $filters['to'] !== '' && $filters['from'] > $filters['to']) {
                $validator->errors()->add('filters.to', 'The end date must be after or equal to the start date.');
            }
            if (is_array($filters) && is_string($filters['sort'] ?? null)) {
                $allowed = $this->sortColumns((string) $this->route('dataset'));
                if ($filters['sort'] !== '' && ! in_array($filters['sort'], $allowed, true)) {
                    $validator->errors()->add('filters.sort', 'The selected sort column is invalid.');
                }
            }
        });
    }

    /** @return array<string, mixed> */
    public function validatedFilters(): array
    {
        return $this->validated('filters', []);
    }

    /** @return list<string>|null */
    public function validatedColumns(): ?array
    {
        $columns = $this->validated('columns');

        return is_array($columns) ? array_values($columns) : null;
    }

    public function validatedReportTimezone(): ?string
    {
        return $this->validated('timezone');
    }

    public function validatedReportLocale(): ?string
    {
        return $this->validated('locale');
    }

    /** @param list<string> $allowed */
    private function allowedList(array $allowed): \Closure
    {
        return static function (string $attribute, mixed $value, \Closure $fail) use ($allowed): void {
            $values = is_array($value) ? $value : [$value];
            if (count($values) > 50) {
                $fail('The selected list is too long.');

                return;
            }
            foreach ($values as $item) {
                if (! is_string($item) || ! in_array($item, $allowed, true)) {
                    $fail('The selected value is invalid.');

                    return;
                }
            }
        };
    }

    private function boundedStrings(int $maxItems, int $maxLength): \Closure
    {
        return static function (string $attribute, mixed $value, \Closure $fail) use ($maxItems, $maxLength): void {
            $values = is_array($value) ? $value : [$value];
            if (count($values) > $maxItems) {
                $fail('The selected list is too long.');

                return;
            }
            foreach ($values as $item) {
                if (! is_string($item) || mb_strlen($item) > $maxLength) {
                    $fail('The selected value is invalid.');

                    return;
                }
            }
        };
    }

    /** @return list<string> */
    private function sortColumns(string $dataset): array
    {
        return match ($dataset) {
            'users' => ['name', 'status', 'created_at', 'updated_at', 'record_status', 'created_by', 'updated_by'],
            'invitations' => ['status', 'created_at', 'updated_at', 'record_status', 'created_by', 'updated_by'],
            'registrations' => ['created_at', 'updated_at'],
            'roles' => ['display_name', 'is_system', 'users_count', 'permissions_count', 'status', 'created_at', 'updated_at', 'record_status', 'created_by', 'updated_by'],
            'audit' => ['event', 'subject_type', 'occurred_at', 'actor'],
            'ip-blocks' => ['ip_address', 'is_active', 'blocked_at', 'last_seen_at', 'created_at', 'updated_at', 'record_status', 'created_by', 'updated_by'],
            'visit-logs' => ['occurred_at', 'ip_address', 'location_city', 'event_type', 'status_code'],
            'countries' => ['code', 'name', 'created_at', 'updated_at', 'record_status', 'created_by', 'updated_by'],
            'timezones' => ['name', 'created_at', 'updated_at', 'record_status', 'created_by', 'updated_by'],
            default => [],
        };
    }
}
