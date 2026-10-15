import AuthLayoutTemplate from '@/layouts/auth/auth-split-layout';
import { FlashAlert } from '@/components/flash-alert';
import type { AuthLayoutProps } from '@/types';

export default function AuthLayout({
    title = '',
    description = '',
    artwork,
    children,
}: AuthLayoutProps) {
    return (
        <AuthLayoutTemplate
            title={title}
            description={description}
            artwork={artwork}
        >
            <FlashAlert />
            {children}
        </AuthLayoutTemplate>
    );
}
