<?php

namespace App\Actions\Exports;

use App\Models\ExportArtifact;
use Dompdf\Dompdf;
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
            'pdf' => $this->pdf($title, $columns, $rows),
            'print' => view('exports.print', ['title' => $title, 'columns' => $columns, 'rows' => $rows, 'generatedAt' => now()])->render(),
            default => throw new \InvalidArgumentException('Unsupported export format.'),
        };

        if (! Storage::disk('local')->put($path, $contents)) {
            throw new \RuntimeException('The export file could not be stored.');
        }

        $artifact->forceFill(['disk' => 'local', 'path' => $path, 'row_count' => count($rows)])->save();
    }

    public function extension(string $format): string
    {
        return $format === 'print' ? 'html' : $format;
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
    private function pdf(string $title, array $columns, array $rows): string
    {
        $options = new Options;
        $options->setIsRemoteEnabled(false);
        $options->setIsPhpEnabled(false);
        $options->setIsJavascriptEnabled(false);
        $dompdf = new Dompdf($options);
        $html = view('exports.pdf', ['title' => $title, 'columns' => $columns, 'rows' => $rows, 'generatedAt' => now()])->render();
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        $dompdf->getCanvas()->page_text(42, 570, 'FieldOps • Page {PAGE_NUM} of {PAGE_COUNT}', 'Helvetica', 8, [0.38, 0.42, 0.48]);

        return $dompdf->output();
    }
}
