import { router } from '@inertiajs/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { resolvePageFamily } from '@/features/page-loading/page-families';
import type { PageFamily } from '@/features/page-loading/page-families';
import { PageLoadingSkeleton } from '@/features/page-loading/page-loading-skeleton';

const DEFAULT_DELAY = 200;

type LoadingState = {
    visitId: string;
    prefetchVisitId?: string;
    family: PageFamily;
} | null;

const PageLoadingContext = createContext<LoadingState>(null);

type PageLoadingProviderProps = PropsWithChildren<{
    delay?: number;
}>;

export function PageLoadingProvider({
    children,
    delay = DEFAULT_DELAY,
}: PageLoadingProviderProps) {
    const [loading, setLoading] = useState<LoadingState>(null);
    const activeVisit = useRef<LoadingState>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        document.getElementById('page-loading-fallback')?.remove();

        const clearTimer = () => {
            if (timer.current !== null) {
                clearTimeout(timer.current);
                timer.current = null;
            }
        };

        const showAfterDelay = (
            visitId: string,
            destination: URL,
            prefetchVisitId?: string,
        ) => {
            clearTimer();
            const nextVisit = {
                visitId,
                prefetchVisitId,
                family: resolvePageFamily(destination),
            };
            activeVisit.current = nextVisit;
            timer.current = setTimeout(() => {
                if (activeVisit.current?.visitId === nextVisit.visitId) {
                    setLoading(nextVisit);
                }

                timer.current = null;
            }, delay);
        };

        const clearForVisit = (visitId?: string) => {
            const active = activeVisit.current;

            if (
                !visitId ||
                (active?.visitId !== visitId &&
                    active?.prefetchVisitId !== visitId)
            ) {
                return;
            }

            clearTimer();
            activeVisit.current = null;
            setLoading(null);
        };

        const removeBeforeListener = router.on('before', (event) => {
            const visit = event.detail.visit;

            if (visit.method !== 'get' || visit.prefetch || visit.async) {
                return;
            }

            const cached = router.getCached(visit.url, visit);

            if (cached) {
                showAfterDelay(visit.id, visit.url, cached.params.id);
            }
        });

        const removeStartListener = router.on('start', (event) => {
            const visit = event.detail.visit;

            if (visit.prefetch || visit.async) {
                return;
            }

            if (visit.method !== 'get') {
                clearTimer();
                activeVisit.current = null;
                setLoading(null);

                return;
            }

            showAfterDelay(visit.id, visit.url);
        });

        const removeFinishListener = router.on('finish', (event) => {
            clearForVisit(event.detail.visit.id);
        });

        const removeSuccessListener = router.on('success', (event) => {
            clearForVisit(event.detail.visitId);
        });

        const removeErrorListener = router.on('error', (event) => {
            clearForVisit(event.detail.visitId);
        });

        return () => {
            clearTimer();
            activeVisit.current = null;
            removeBeforeListener();
            removeStartListener();
            removeFinishListener();
            removeSuccessListener();
            removeErrorListener();
        };
    }, [delay]);

    return (
        <PageLoadingContext.Provider value={loading}>
            {children}
        </PageLoadingContext.Provider>
    );
}

export function PageLoadingBoundary({ children }: PropsWithChildren) {
    const loading = useContext(PageLoadingContext);

    if (loading) {
        return <PageLoadingSkeleton family={loading.family} />;
    }

    return children;
}
