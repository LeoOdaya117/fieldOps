import { Head } from '@inertiajs/react';
import { dashboard, login } from '@/routes';
import { LandingFooter } from './landing-footer';
import { LandingHeader } from './landing-header';
import {
    LandingChallenge,
    LandingCta,
    LandingFaq,
    LandingHero,
    LandingOffline,
    LandingOutcomes,
    LandingTour,
    LandingWorkflow,
} from './landing-sections';

type LandingPageProps = {
    isAuthenticated: boolean;
};

export function LandingPage({ isAuthenticated }: LandingPageProps) {
    const primaryHref = isAuthenticated ? dashboard() : login();
    const primaryLabel = isAuthenticated ? 'Open Dashboard' : 'Sign in';

    return (
        <>
            <Head title="One connected system for every job in the field." />
            <div className="marketing-page-shell min-h-svh overflow-x-clip bg-background text-foreground">
                <LandingHeader isAuthenticated={isAuthenticated} />
                <main>
                    <LandingHero
                        primaryHref={primaryHref}
                        primaryLabel={primaryLabel}
                    />
                    <LandingChallenge />
                    <LandingTour />
                    <LandingWorkflow />
                    <LandingOffline />
                    <LandingOutcomes />
                    <LandingFaq />
                    <LandingCta
                        primaryHref={primaryHref}
                        primaryLabel={primaryLabel}
                    />
                </main>
                <LandingFooter isAuthenticated={isAuthenticated} />
            </div>
        </>
    );
}
