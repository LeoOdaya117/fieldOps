import { FilesList } from '@/features/files/components/files-list';
import type { FilesListProps } from '@/features/files/components/files-list';
import { dashboard } from '@/routes';
import { index as filesIndex } from '@/routes/files';

function FilesPage(props: FilesListProps) {
    return <FilesList {...props} />;
}

FilesPage.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Files', href: filesIndex() },
    ],
};

export default FilesPage;
