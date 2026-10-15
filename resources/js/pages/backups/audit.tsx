import { BackupAudit } from '@/features/backups/components/backup-audit';
import type { BackupAuditProps } from '@/features/backups/types';
import { audit, index } from '@/routes/system-settings/backups';

export default function BackupAuditPage(props: BackupAuditProps) {
    return <BackupAudit {...props} />;
}
BackupAuditPage.layout = {
    breadcrumbs: [
        { title: 'Backup & Restore', href: index.url() },
        { title: 'Backup audit', href: audit.url() },
    ],
};
