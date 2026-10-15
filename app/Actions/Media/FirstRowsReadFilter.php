<?php

namespace App\Actions\Media;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Reader\IReadFilter;

class FirstRowsReadFilter implements IReadFilter
{
    public function __construct(
        private readonly int $maxRows,
        private readonly int $maxColumns,
    ) {}

    public function readCell(string $columnAddress, int $row, string $worksheetName = ''): bool
    {
        return $row >= 1 && $row <= $this->maxRows
            && Coordinate::columnIndexFromString($columnAddress) <= $this->maxColumns;
    }
}
