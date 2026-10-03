<style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; }
    body { color: #182230; font-family: DejaVu Sans, Arial, sans-serif; font-size: 9pt; margin: 0; }
    .report-header { border-bottom: 1px solid #9aa4b2; margin-bottom: 8mm; padding-bottom: 4mm; }
    .report-brand { color: #175cd3; font-size: 9pt; font-weight: bold; letter-spacing: .08em; text-transform: uppercase; }
    h1 { font-size: 18pt; margin: 2mm 0; }
    .report-meta { color: #475467; font-size: 8pt; }
    .report-footer { border-top: 1px solid #d0d5dd; color: #475467; font-size: 8pt; margin-top: 7mm; padding-top: 3mm; }
    table { border-collapse: collapse; table-layout: auto; width: 100%; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th, td { border: 1px solid #d0d5dd; padding: 5px 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f2f4f7; font-size: 7.5pt; font-weight: bold; }
    td { font-size: 7.5pt; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .empty { color: #667085; font-style: italic; padding: 10mm 2mm; text-align: center; }
    .print-action { margin: 0 0 6mm; }
    @media print {
        .print-action { display: none; }
        .report-footer { position: fixed; bottom: -10mm; left: 0; right: 0; }
    }
</style>
