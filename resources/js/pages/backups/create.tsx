import { BackupCreate } from '@/features/backups/components/backup-create';
import type { BackupCreateProps } from '@/features/backups/types';
import { create, index } from '@/routes/system-settings/backups';

export default function CreateBackup(props: BackupCreateProps) {
    return <BackupCreate {...props} />;
}
CreateBackup.layout = {
    breadcrumbs: [
        { title: 'Backup & Restore', href: index.url() },
        { title: 'Create backup', href: create.url() },
    ],
};
