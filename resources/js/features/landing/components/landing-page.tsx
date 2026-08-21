import { Head } from '@inertiajs/react';
import { dashboard, register } from '@/routes';
import { MarketingFooter } from '@/features/marketing/components/marketing-footer';
import { LandingHeader } from './landing-header';
import {
    LandingCapabilities,
    LandingChallenge,
    LandingCta,
    LandingHero,
    LandingMapping,
    LandingOffline,
    LandingReporting,
    LandingWorkflow,
} from './landing-sections';

type LandingPageProps = {
    isAuthenticated: boolean;
};

export function LandingPage({ isAuthenticated }: LandingPageProps) {
    const primaryHref = isAuthenticated ? dashboard() : register();
    const primaryLabel = isAuthenticated ? 'Open Dashboard' : 'Start Free';

    return (
        <>
            <Head title="One connected system for every job in the field." />
            <div className="marketing-page-shell min-h-svh overflow-x-clip bg-background text-foreground">
                <LandingHeader
                    isAuthenticated={isAuthenticated}
                    variant="journey"
                />
                <main>
                    <LandingHero
                        primaryHref={primaryHref}
                        primaryLabel={primaryLabel}
                    />
                    <LandingChallenge />
                    <LandingWorkflow />
                    <LandingCapabilities />
                    <LandingOffline />
                    <LandingMapping />
                    <LandingReporting />
                    <LandingCta
                        primaryHref={primaryHref}
                        primaryLabel={primaryLabel}
                    />
                </main>
                <MarketingFooter />
            </div>
        </>
    );
}
