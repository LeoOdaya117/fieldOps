import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type ScrollRevealProps = {
    children: ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'left' | 'right';
};

const initialTransforms = {
    up: 'translate-y-6',
    left: '-translate-x-6',
    right: 'translate-x-6',
} as const;

export function ScrollReveal({
    children,
    className,
    delay = 0,
    direction = 'up',
}: ScrollRevealProps) {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const element = elementRef.current;

        if (!element || isVisible || typeof window === 'undefined') {
            return;
        }

        const prefersReducedMotion =
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
            false;

        if (
            prefersReducedMotion ||
            typeof IntersectionObserver === 'undefined'
        ) {
            const timeoutId = window.setTimeout(() => setIsVisible(true), 0);

            return () => window.clearTimeout(timeoutId);
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(element);
                }
            },
            {
                threshold: 0.12,
                rootMargin: '0px 0px -8% 0px',
            },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [isVisible]);

    return (
        <div
            ref={elementRef}
            data-scroll-reveal="true"
            data-revealed={isVisible}
            className={cn(
                'motion-safe:transition-[opacity,transform] motion-safe:duration-700 motion-safe:ease-out motion-reduce:transform-none motion-reduce:opacity-100 motion-reduce:transition-none',
                isVisible
                    ? 'translate-x-0 translate-y-0 opacity-100'
                    : cn('opacity-0', initialTransforms[direction]),
                className,
            )}
            style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
        >
            {children}
        </div>
    );
}
