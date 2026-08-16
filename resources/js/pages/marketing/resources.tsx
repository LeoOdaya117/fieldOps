import { usePage } from '@inertiajs/react';
import { MarketingPage } from '@/features/marketing/components/marketing-page';
import { marketingPages } from '@/features/marketing/data';

export default function Resources() {
    const { auth } = usePage().props;

    return (
        <MarketingPage
            config={marketingPages.resources}
            isAuthenticated={Boolean(auth.user)}
        />
    );
}
