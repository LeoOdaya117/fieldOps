import { BackupInventory } from '@/features/backups/components/backup-inventory';
import type { BackupPageProps } from '@/features/backups/types';
import { index } from '@/routes/system-settings/backups';

export default function Backups(props: BackupPageProps) {
    return <BackupInventory {...props} />;
}
Backups.layout = {
    breadcrumbs: [{ title: 'Backup & Restore', href: index.url() }],
};
