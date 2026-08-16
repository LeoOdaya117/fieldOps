import { usePage } from '@inertiajs/react';
import { LandingPage } from '@/features/landing/components/landing-page';

export default function Welcome() {
    const { auth } = usePage().props;

    return <LandingPage isAuthenticated={Boolean(auth.user)} />;
}
