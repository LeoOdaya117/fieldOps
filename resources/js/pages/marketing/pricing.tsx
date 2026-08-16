import { usePage } from '@inertiajs/react';
import { MarketingPage } from '@/features/marketing/components/marketing-page';
import { marketingPages } from '@/features/marketing/data';

export default function Pricing() {
    const { auth } = usePage().props;

    return (
        <MarketingPage
            config={marketingPages.pricing}
            isAuthenticated={Boolean(auth.user)}
        />
    );
}
