<?php

namespace App\Actions\Exports;

use App\Models\ExportArtifact;
use Dompdf\Canvas;
use Dompdf\Dompdf;
use Dompdf\FontMetrics;
use Dompdf\Options;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup as WorksheetPageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExportReportWriter
{
    /**
     * @param  array<string, string>  $columns
     * @param  list<array<string, scalar|null>>  $rows
     */
    public function write(ExportArtifact $artifact, string $title, array $columns, array $rows): void
    {
        $path = 'exports/'.$artifact->owner_id.'/'.$artifact->getKey().'.'.$this->extension($artifact->format);
        $contents = match ($artifact->format) {
            'csv' => $this->csv($columns, $rows),
            'xlsx' => $this->xlsx($title, $columns, $rows),
            'pdf', 'print' => $this->pdf($title, $columns, $rows, $artifact->filters['_report_timezone'] ?? null),
            default => throw new \InvalidArgumentException('Unsupported export format.'),
        };

        if (! Storage::disk('local')->put($path, $contents)) {
            throw new \RuntimeException('The export file could not be stored.');
        }

        $artifact->forceFill(['disk' => 'local', 'path' => $path, 'row_count' => count($rows)])->save();
    }

    public function extension(string $format): string
    {
        return $format === 'print' ? 'pdf' : $format;
    }

    /** @param array<string, string> $columns
     * @param  list<array<string, scalar|null>>  $rows
     */
    private function csv(array $columns, array $rows): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Export');
        foreach (array_values($columns) as $columnIndex => $label) {
            $sheet->getCell([$columnIndex + 1, 1])->setValueExplicit($label, DataType::TYPE_STRING);
        }
        foreach ($rows as $rowIndex => $row) {
            foreach (array_keys($columns) as $columnIndex => $key) {
                $value = $row[$key] ?? '';
                $text = (string) $value;
                if (preg_match('/^[\x00-\x20]*[=+\-@]/u', $text) === 1 && ! is_numeric($text)) {
                    $text = "'".$text;
                }
                $sheet->getCell([$columnIndex + 1, $rowIndex + 2])->setValueExplicit($text, DataType::TYPE_STRING);
            }
        }

        $temporary = tempnam(sys_get_temp_dir(), 'fieldops-export-csv-');
        if ($temporary === false) {
            $spreadsheet->disconnectWorksheets();
            throw new \RuntimeException('CSV output could not be created.');
        }
        try {
            $writer = new Csv($spreadsheet);
            $writer->setDelimiter(',');
            $writer->setEnclosure('"');
            $writer->setLineEnding("\r\n");
            $writer->setUseBOM(true);
            $writer->save($temporary);
            $contents = file_get_contents($temporary);
            if (! is_string($contents)) {
                throw new \RuntimeException('CSV output could not be read.');
            }

            return $contents;
        } finally {
            @unlink($temporary);
            $spreadsheet->disconnectWorksheets();
        }
    }

    /** @param array<string, string> $columns
     * @param  list<array<string, scalar|null>>  $rows
     */
    private function xlsx(string $title, array $columns, array $rows): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Export');
        $lastColumn = $this->columnName(max(1, count($columns)));
        $sheet->mergeCells('A1:'.$lastColumn.'1');
        $sheet->getCell('A1')->setValueExplicit($title, DataType::TYPE_STRING);
        $sheet->mergeCells('A2:'.$lastColumn.'2');
        $sheet->getCell('A2')->setValueExplicit('Generated '.now()->format('F j, Y g:i A').' · '.count($rows).' '.(count($rows) === 1 ? 'record' : 'records'), DataType::TYPE_STRING);

        foreach (array_values($columns) as $index => $label) {
            $cell = $sheet->getCell([$index + 1, 4]);
            $cell->setValueExplicit($label, DataType::TYPE_STRING);
        }
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A2')->getFont()->setItalic(true)->setSize(9);
        $sheet->getStyle('4:4')->getFont()->setBold(true);
        $sheet->freezePane('A5');
        $sheet->getPageSetup()->setOrientation('portrait')->setPaperSize(WorksheetPageSetup::PAPERSIZE_A4)->setFitToWidth(1)->setFitToHeight(0);
        $sheet->getPageSetup()->setFitToPage(true)->setRowsToRepeatAtTopByStartAndEnd(4, 4);
        $sheet->getPageMargins()->setTop(0.59)->setBottom(0.59)->setLeft(0.59)->setRight(0.59);
        $sheet->getHeaderFooter()->setOddHeader('&BFieldOps&B · '.$title);
        $sheet->getHeaderFooter()->setOddFooter('&BFieldOps&B · Page &P of &N');
        foreach ($rows as $rowIndex => $row) {
            foreach (array_keys($columns) as $columnIndex => $key) {
                $value = $row[$key] ?? '';
                $cell = $sheet->getCell([$columnIndex + 1, $rowIndex + 5]);
                $cell->setValueExplicit((string) $value, DataType::TYPE_STRING);
            }
        }
        foreach (range(1, max(1, count($columns))) as $columnIndex) {
            $sheet->getColumnDimensionByColumn($columnIndex)->setAutoSize(true);
        }

        $temporary = tempnam(sys_get_temp_dir(), 'fieldops-export-');
        if ($temporary === false) {
            throw new \RuntimeException('Excel output could not be created.');
        }
        try {
            (new Xlsx($spreadsheet))->save($temporary);
            $contents = file_get_contents($temporary);
            if (! is_string($contents)) {
                throw new \RuntimeException('Excel output could not be read.');
            }

            return $contents;
        } finally {
            @unlink($temporary);
            $spreadsheet->disconnectWorksheets();
        }
    }

    private function columnName(int $index): string
    {
        $name = '';
        while ($index > 0) {
            $index--;
            $name = chr($index % 26 + 65).$name;
            $index = intdiv($index, 26);
        }

        return $name;
    }

    /** @param array<string, string> $columns
     * @param  list<array<string, scalar|null>>  $rows
     */
    private function pdf(string $title, array $columns, array $rows, mixed $timezone = null): string
    {
        $options = new Options;
        $options->setIsRemoteEnabled(false);
        $options->setIsPhpEnabled(false);
        $options->setIsJavascriptEnabled(false);
        $dompdf = new Dompdf($options);
        $generatedAt = now();
        if (is_string($timezone) && in_array($timezone, \DateTimeZone::listIdentifiers(\DateTimeZone::ALL_WITH_BC), true)) {
            $generatedAt = $generatedAt->setTimezone($timezone);
        }
        $html = view('exports.pdf', [
            'title' => $title,
            'columns' => $columns,
            'rows' => $rows,
            'generatedAt' => $generatedAt,
            'compactTable' => count($columns) >= 8,
        ])->render();
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        $dompdf->getCanvas()->page_script(static function (int $pageNumber, int $pageCount, Canvas $canvas, FontMetrics $fonts): void {
            $left = 42.52; // 15 mm page margin on A4.
            $right = $canvas->get_width() - $left;
            $lineY = $canvas->get_height() - 36;
            $textY = $lineY + 8;
            $font = $fonts->getFont('DejaVu Sans');
            $color = [0.28, 0.33, 0.40];
            $pagination = "Page {$pageNumber} of {$pageCount}";

            $canvas->line($left, $lineY, $right, $lineY, [0.82, 0.84, 0.87], 0.5);
            $canvas->text($left, $textY, 'FieldOps · Confidential system report', $font, 8, $color);
            $canvas->text($right - $canvas->get_text_width($pagination, $font, 8), $textY, $pagination, $font, 8, $color);
        });

        return $dompdf->output();
    }
}
