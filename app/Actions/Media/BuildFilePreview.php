<?php

namespace App\Actions\Media;

use App\Models\MediaAsset;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\IOFactory;
use RuntimeException;
use Throwable;
use XMLReader;
use ZipArchive;

class BuildFilePreview
{
    /** @return list<list<string>> */
    public function execute(MediaAsset $asset): array
    {
        return match ($asset->extension) {
            'csv' => $this->csv($asset),
            'xls' => $this->xls($asset),
            'xlsx' => $this->xlsx($asset),
            default => throw new RuntimeException('A safe table preview is unavailable for this file.'),
        };
    }

    /** @return list<list<string>> */
    private function xls(MediaAsset $asset): array
    {
        $source = Storage::disk($asset->disk)->readStream($asset->path);
        if (! is_resource($source)) {
            throw new RuntimeException('The file could not be read.');
        }
        $temporary = tempnam(sys_get_temp_dir(), 'fieldops-xls-preview-');
        if (! is_string($temporary)) {
            fclose($source);
            throw new RuntimeException('The preview could not be prepared.');
        }

        try {
            $destination = fopen($temporary, 'wb');
            if (! is_resource($destination)) {
                throw new RuntimeException('The preview could not be prepared.');
            }
            try {
                $limit = (int) config('media-assets.preview_max_bytes', 1024 * 1024);
                if (stream_copy_to_stream($source, $destination, $limit + 1) > $limit) {
                    throw new RuntimeException('This spreadsheet is too large to preview.');
                }
            } finally {
                fclose($destination);
            }

            $maxRows = (int) config('media-assets.preview_max_rows', 50);
            $maxColumns = (int) config('media-assets.preview_max_columns', 20);
            $reader = IOFactory::createReader('Xls');
            $reader->setReadDataOnly(true);
            $reader->setReadFilter(new FirstRowsReadFilter($maxRows, $maxColumns));
            $sheetNames = $reader->listWorksheetNames($temporary);
            if ($sheetNames === []) {
                throw new RuntimeException('This spreadsheet has no worksheet to preview.');
            }
            $reader->setLoadSheetsOnly($sheetNames[0]);
            $workbook = $reader->load($temporary);
            try {
                $sheet = $workbook->getSheet(0);
                $rows = [];
                for ($row = 1; $row <= min($maxRows, $sheet->getHighestRow()); $row++) {
                    $cells = [];
                    for ($column = 1; $column <= $maxColumns; $column++) {
                        $value = $sheet->getCell([$column, $row])->getValue();
                        $cells[] = is_scalar($value) ? mb_substr((string) $value, 0, 1000) : '';
                    }
                    while ($cells !== [] && end($cells) === '') {
                        array_pop($cells);
                    }
                    $rows[] = $cells;
                }

                return $rows;
            } finally {
                $workbook->disconnectWorksheets();
            }
        } catch (RuntimeException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new RuntimeException('This spreadsheet could not be previewed.', previous: $exception);
        } finally {
            fclose($source);
            @unlink($temporary);
        }
    }

    /** @return list<list<string>> */
    private function csv(MediaAsset $asset): array
    {
        $stream = Storage::disk($asset->disk)->readStream($asset->path);
        if (! is_resource($stream)) {
            throw new RuntimeException('The file could not be read.');
        }

        try {
            $contents = stream_get_contents($stream, (int) config('media-assets.preview_max_bytes', 1024 * 1024) + 1);
        } finally {
            fclose($stream);
        }
        if (! is_string($contents) || strlen($contents) > (int) config('media-assets.preview_max_bytes', 1024 * 1024)) {
            throw new RuntimeException('This file is too large to preview.');
        }
        $previewStream = fopen('php://temp', 'w+');
        if (! is_resource($previewStream)) {
            throw new RuntimeException('The preview could not be prepared.');
        }
        fwrite($previewStream, $contents);
        rewind($previewStream);

        $rows = [];
        $maxRows = (int) config('media-assets.preview_max_rows', 50);
        $maxColumns = (int) config('media-assets.preview_max_columns', 20);
        try {
            while (count($rows) < $maxRows && ($row = fgetcsv($previewStream)) !== false) {
                $rows[] = array_map(static fn ($cell): string => mb_substr((string) $cell, 0, 1000), array_slice($row, 0, $maxColumns));
            }
        } finally {
            fclose($previewStream);
        }

        return $rows;
    }

    /** @return list<list<string>> */
    private function xlsx(MediaAsset $asset): array
    {
        if (! class_exists(ZipArchive::class)) {
            throw new RuntimeException('Spreadsheet preview requires the PHP ZIP extension.');
        }

        $source = Storage::disk($asset->disk)->readStream($asset->path);
        if (! is_resource($source)) {
            throw new RuntimeException('The file could not be read.');
        }
        $temporary = tempnam(sys_get_temp_dir(), 'fieldops-preview-');
        if (! is_string($temporary)) {
            fclose($source);
            throw new RuntimeException('The preview could not be prepared.');
        }

        try {
            $destination = fopen($temporary, 'wb');
            if (! is_resource($destination)) {
                throw new RuntimeException('The preview could not be prepared.');
            }
            try {
                $limit = (int) config('media-assets.preview_max_bytes', 1024 * 1024);
                if (stream_copy_to_stream($source, $destination, $limit + 1) > $limit) {
                    throw new RuntimeException('This spreadsheet is too large to preview.');
                }
            } finally {
                fclose($destination);
            }

            $zip = new ZipArchive;
            if ($zip->open($temporary) !== true) {
                throw new RuntimeException('This spreadsheet could not be opened.');
            }
            try {
                $xmlLimit = (int) config('media-assets.preview_max_xml_bytes', 1024 * 1024);
                $sheetStat = $zip->statName('xl/worksheets/sheet1.xml');
                if (! is_array($sheetStat) || $sheetStat['size'] > $xmlLimit) {
                    throw new RuntimeException('This spreadsheet is too large to preview.');
                }
                $sheet = $zip->getFromName('xl/worksheets/sheet1.xml');
                if (! is_string($sheet) || strlen($sheet) > $xmlLimit) {
                    throw new RuntimeException('This spreadsheet has no first worksheet.');
                }
                [$rows, $references] = $this->readWorksheetRows($sheet);
                $stringsStat = $zip->statName('xl/sharedStrings.xml');
                if (is_array($stringsStat) && $stringsStat['size'] > $xmlLimit) {
                    throw new RuntimeException('This spreadsheet is too large to preview.');
                }
                $strings = $zip->getFromName('xl/sharedStrings.xml');
                if ($references !== [] && is_string($strings)) {
                    $shared = $this->readSharedStrings($strings, max(array_column($references, 'index')));
                    foreach ($references as $reference) {
                        $rows[$reference['row']][$reference['column']] = $shared[$reference['index']] ?? '';
                    }
                }

                return array_map(static fn (array $row): array => array_values($row), $rows);
            } finally {
                $zip->close();
            }
        } finally {
            fclose($source);
            @unlink($temporary);
        }
    }

    /**
     * @return array{0: list<list<string>>, 1: list<array{row: int, column: int, index: int}>}
     */
    private function readWorksheetRows(string $sheet): array
    {
        $reader = new XMLReader;
        if (! $reader->XML($sheet, null, LIBXML_NONET)) {
            throw new RuntimeException('This spreadsheet could not be parsed.');
        }

        $rows = [];
        $references = [];
        $visited = 0;
        $nodeLimit = (int) config('media-assets.preview_max_xml_nodes', 10000);
        $maxRows = (int) config('media-assets.preview_max_rows', 50);
        $maxColumns = (int) config('media-assets.preview_max_columns', 20);
        try {
            while ($reader->read() && count($rows) < $maxRows) {
                if (++$visited > $nodeLimit) {
                    throw new RuntimeException('This spreadsheet is too complex to preview.');
                }
                if ($reader->nodeType !== XMLReader::ELEMENT || $reader->localName !== 'row') {
                    continue;
                }

                $fragment = $reader->readOuterXml();
                $this->assertXmlNodeBudget($fragment);
                $row = simplexml_load_string($fragment, 'SimpleXMLElement', LIBXML_NONET);
                if ($row === false) {
                    throw new RuntimeException('This spreadsheet could not be parsed.');
                }

                $cells = [];
                foreach ($row->c as $cell) {
                    if (count($cells) >= $maxColumns) {
                        break;
                    }
                    $value = (string) ($cell->v ?? $cell->is->t ?? '');
                    if ((string) $cell['t'] === 's') {
                        $references[] = ['row' => count($rows), 'column' => count($cells), 'index' => (int) $value];
                        $cells[] = '';
                    } else {
                        $cells[] = mb_substr($value, 0, 1000);
                    }
                }
                $rows[] = $cells;
            }
        } finally {
            $reader->close();
        }

        return [$rows, $references];
    }

    /** @return array<int, string> */
    private function readSharedStrings(string $strings, int $lastIndex): array
    {
        $reader = new XMLReader;
        if (! $reader->XML($strings, null, LIBXML_NONET)) {
            throw new RuntimeException('This spreadsheet could not be parsed.');
        }

        $shared = [];
        $index = 0;
        $visited = 0;
        $nodeLimit = (int) config('media-assets.preview_max_xml_nodes', 10000);
        try {
            while ($reader->read() && $index <= $lastIndex) {
                if (++$visited > $nodeLimit) {
                    throw new RuntimeException('This spreadsheet is too complex to preview.');
                }
                if ($reader->nodeType !== XMLReader::ELEMENT || $reader->localName !== 'si') {
                    continue;
                }

                $fragment = $reader->readOuterXml();
                $this->assertXmlNodeBudget($fragment);
                $item = simplexml_load_string($fragment, 'SimpleXMLElement', LIBXML_NONET);
                if ($item === false) {
                    throw new RuntimeException('This spreadsheet could not be parsed.');
                }
                $shared[$index++] = mb_substr((string) ($item->t ?? ''), 0, 1000);
            }
        } finally {
            $reader->close();
        }

        return $shared;
    }

    private function assertXmlNodeBudget(string $xml): void
    {
        if (strlen($xml) > (int) config('media-assets.preview_max_xml_bytes', 1024 * 1024)
            || substr_count($xml, '<') > (int) config('media-assets.preview_max_xml_nodes', 10000)) {
            throw new RuntimeException('This spreadsheet is too complex to preview.');
        }
    }
}
