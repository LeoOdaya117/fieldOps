import { router, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    Download,
    FileSpreadsheet,
    FileText,
    Printer,
    Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    buildExportFilters,
    getAvailableExportFormats,
} from '@/features/exports/lib/export-filters';
import { startBrowserDownload } from '@/features/exports/lib/browser-download';
import type {
    DataTableExportOptions,
    ExportFormat,
} from '@/features/exports/types';
import { store as exportStore } from '@/routes/exports';

const formats: {
    format: ExportFormat;
    label: string;
    Icon: typeof FileText;
}[] = [
    { format: 'pdf', label: 'PDF', Icon: FileText },
    { format: 'csv', label: 'CSV', Icon: Table2 },
    { format: 'xlsx', label: 'Excel (.xlsx)', Icon: FileSpreadsheet },
    { format: 'print', label: 'Print', Icon: Printer },
];

function firstErrorMessage(errors: Record<string, string>) {
    return Object.values(errors).find((value) => value.trim().length > 0);
}

export function DataTableExportActions({
    options,
}: {
    options: DataTableExportOptions;
}) {
    const { props } = usePage();
    const permissions = props.auth.authorization.permissions;
    const availableFormats = getAvailableExportFormats(options, permissions);
    const [processingFormat, setProcessingFormat] =
        useState<ExportFormat | null>(null);

    if (availableFormats.length === 0) {
        return null;
    }

    const startExport = (format: ExportFormat) => {
        let toastId: string | number | undefined;
        const showToast = (
            type: 'success' | 'info' | 'error',
            message: string,
            options: Parameters<typeof toast.success>[1] = {},
        ) => {
            toast[type](message, {
                ...options,
                ...(toastId !== undefined ? { id: toastId } : {}),
            });
            toastId = undefined;
        };
        const printWindow =
            format === 'print'
                ? window.open(
                      'about:blank',
                      'fieldops-print-export',
                      'popup=yes,width=1100,height=750,resizable=yes,scrollbars=yes',
                  )
                : null;

        if (printWindow) {
            printWindow.opener = null;
            printWindow.document.title = 'Preparing print view';
            printWindow.document.body.textContent =
                'Preparing your print view…';
        }

        router.post(
            exportStore.url({ dataset: options.dataset, format }),
            { filters: buildExportFilters(options.filters) },
            {
                onStart: () => {
                    setProcessingFormat(format);
                    toastId = toast.loading(
                        `Preparing ${format.toUpperCase()} export…`,
                    );
                },
                onSuccess: (page) => {
                    const exportResult = page.props.flash?.exportResult;

                    if (!exportResult) {
                        printWindow?.close();
                        showToast(
                            'error',
                            'The server did not return an export status. Please try again.',
                        );

                        return;
                    }

                    if (exportResult.status !== 'ready') {
                        printWindow?.close();
                        showToast('info', exportResult.message);

                        return;
                    }

                    const resultUrl =
                        format === 'print'
                            ? (exportResult.printUrl ??
                              exportResult.downloadUrl)
                            : exportResult.downloadUrl;

                    if (format === 'print') {
                        if (printWindow && resultUrl) {
                            printWindow.location.replace(resultUrl);
                            showToast('success', exportResult.message);
                        } else if (printWindow) {
                            printWindow.close();
                            showToast(
                                'error',
                                'The print view is ready, but no print URL was provided.',
                            );
                        } else if (resultUrl) {
                            showToast('info', exportResult.message, {
                                action: {
                                    label: 'Open print view',
                                    onClick: () => {
                                        window.open(
                                            resultUrl,
                                            'fieldops-print-export',
                                            'popup=yes,width=1100,height=750,resizable=yes,scrollbars=yes',
                                        );
                                    },
                                },
                            });
                        } else {
                            showToast(
                                'error',
                                'The print view is ready, but no print URL was provided.',
                            );
                        }

                        return;
                    }

                    if (exportResult.downloadUrl) {
                        startBrowserDownload(exportResult.downloadUrl);
                        showToast('success', exportResult.message);
                    } else {
                        showToast(
                            'error',
                            'The export is ready, but no download URL was provided.',
                        );
                    }
                },
                onError: (errors) => {
                    printWindow?.close();
                    showToast(
                        'error',
                        firstErrorMessage(errors) ??
                            'The export could not be started. Check your access and try again.',
                    );
                },
                onFinish: () => {
                    setProcessingFormat(null);

                    if (toastId !== undefined) {
                        toast.dismiss(toastId);
                    }
                },
            },
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={processingFormat !== null}
                    aria-label="Export options"
                >
                    <Download aria-hidden="true" />
                    <span>Export</span>
                    <ChevronDown aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[min(18rem,calc(100vw-2rem))] bg-popover text-popover-foreground"
            >
                <DropdownMenuLabel>Export as</DropdownMenuLabel>
                {formats
                    .filter(({ format }) => availableFormats.includes(format))
                    .map(({ format, label, Icon }) => (
                        <DropdownMenuItem
                            key={format}
                            onSelect={() => startExport(format)}
                        >
                            <Icon aria-hidden="true" />
                            {label}
                        </DropdownMenuItem>
                    ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
