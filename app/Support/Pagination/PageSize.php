<?php

namespace App\Support\Pagination;

use App\Support\SystemSettings;
use Illuminate\Http\Request;

final class PageSize
{
    public const DEFAULT = 50;

    /**
     * @var list<int>
     */
    public const OPTIONS = [25, 50, 75, 100];

    public static function resolve(Request $request): int
    {
        $pageSize = $request->integer('per_page');

        return in_array($pageSize, self::OPTIONS, true) ? $pageSize : SystemSettings::paginationSize();
    }

    /**
     * @return array<string, mixed>
     */
    public static function query(Request $request, int $pageSize): array
    {
        return [
            ...$request->except(['page', 'per_page']),
            'per_page' => $pageSize,
        ];
    }
}
