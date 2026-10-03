<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title }}</title>
    @include('exports._report-styles')
</head>
<body>
    <button class="print-action" type="button" onclick="window.print()">Print report</button>
    <header class="report-header">
        <div class="report-brand">FieldOps</div>
        <h1>{{ $title }}</h1>
        <div class="report-meta">Generated {{ $generatedAt->format('F j, Y g:i A') }} · {{ count($rows) }} {{ count($rows) === 1 ? 'record' : 'records' }}</div>
    </header>
    @if ($rows === [])
        <div class="empty">No records match the selected filters.</div>
    @else
        <table>
            <thead><tr>@foreach ($columns as $label)<th>{{ $label }}</th>@endforeach</tr></thead>
            <tbody>
                @foreach ($rows as $row)
                    <tr>@foreach ($columns as $key => $label)<td>{{ $row[$key] ?? '' }}</td>@endforeach</tr>
                @endforeach
            </tbody>
        </table>
    @endif
    <footer class="report-footer">FieldOps · Confidential system report</footer>
    <script>
        window.addEventListener('load', () => {
            window.setTimeout(() => window.print(), 100);
        }, { once: true });
    </script>
</body>
</html>
