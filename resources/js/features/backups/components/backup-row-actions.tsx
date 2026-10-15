import { Download, Eye, RotateCcw, Trash2 } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { TableActionLink, TableActions } from '@/components/ui/table-actions';
import { download, show } from '@/routes/system-settings/backups';
import type { Backup } from '../types';

export function BackupRowActions({
    backup,
    busy,
    ready,
    onRestore,
    onDelete,
}: {
    backup: Backup;
    busy: boolean;
    ready: boolean;
    onRestore: (backup: Backup) => void;
    onDelete: (backup: Backup) => void;
}) {
    return (
        <TableActions label={`Actions for backup ${backup.id}`}>
            <TableActionLink href={show.url(backup.id)}>
                <Eye aria-hidden="true" />
                View details
            </TableActionLink>
            <DropdownMenuItem asChild disabled={busy}>
                <a
                    href={download.url(backup.id)}
                    onClick={(event) => {
                        if (busy) {
                            event.preventDefault();
                        }
                    }}
                >
                    <Download aria-hidden="true" />
                    Download
                </a>
            </DropdownMenuItem>
            <DropdownMenuItem
                disabled={busy || !ready}
                onSelect={() => onRestore(backup)}
            >
                <RotateCcw aria-hidden="true" />
                Restore
            </DropdownMenuItem>
            <DropdownMenuItem
                disabled={busy || backup.protected}
                className="text-destructive focus:text-destructive"
                onSelect={() => onDelete(backup)}
            >
                <Trash2 aria-hidden="true" />
                Delete
            </DropdownMenuItem>
        </TableActions>
    );
}
