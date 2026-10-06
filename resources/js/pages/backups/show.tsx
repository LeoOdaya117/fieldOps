import { BackupDetail } from '@/features/backups/components/backup-detail';
import type { BackupDetailProps } from '@/features/backups/types';
import { index } from '@/routes/system-settings/backups';

export default function ShowBackup(props: BackupDetailProps) {
    return <BackupDetail {...props} />;
}
ShowBackup.layout = {
    breadcrumbs: [
        { title: 'Backup & Restore', href: index.url() },
        { title: 'Backup details', href: '#' },
    ],
};
