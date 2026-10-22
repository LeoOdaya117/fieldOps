import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';
export type ThemeTransitionOrigin = { readonly x: number; readonly y: number };

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (
        mode: Appearance,
        origin?: ThemeTransitionOrigin,
    ) => void;
};

const listeners = new Set<() => void>();
const themeTransitionClass = 'theme-transitioning';
const themeRippleClass = 'theme-ripple';
const themeTransitionDuration = 180;
const themeRippleProperties = ['--theme-ripple-x', '--theme-ripple-y'] as const;
let currentAppearance: Appearance = 'system';
let themeTransitionTimeout: number | null = null;
let themeViewTransitionId = 0;

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    return (localStorage.getItem('appearance') as Appearance) || 'system';
};

const isDarkMode = (appearance: Appearance): boolean => {
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
};

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const applyThemeWithTransition = (
    appearance: Appearance,
    onApplied: () => void,
    origin?: ThemeTransitionOrigin,
): void => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        applyTheme(appearance);
        onApplied();

        return;
    }

    const root = document.documentElement;
    const transitionId = ++themeViewTransitionId;

    if (themeTransitionTimeout !== null) {
        window.clearTimeout(themeTransitionTimeout);
        themeTransitionTimeout = null;
    }

    root.classList.remove(themeRippleClass);
    themeRippleProperties.forEach((property) =>
        root.style.removeProperty(property),
    );

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.classList.remove(themeTransitionClass);
        applyTheme(appearance);
        onApplied();

        return;
    }

    if (
        origin !== undefined &&
        typeof document.startViewTransition === 'function'
    ) {
        root.classList.remove(themeTransitionClass);
        root.style.setProperty('--theme-ripple-x', `${origin.x}px`);
        root.style.setProperty('--theme-ripple-y', `${origin.y}px`);
        root.classList.add(themeRippleClass);

        try {
            const transition = document.startViewTransition(() => {
                applyTheme(appearance);
                onApplied();
            });
            const clearRippleClass = (): void => {
                if (transitionId === themeViewTransitionId) {
                    root.classList.remove(themeRippleClass);
                    themeRippleProperties.forEach((property) =>
                        root.style.removeProperty(property),
                    );
                }
            };

            void transition.finished.then(clearRippleClass, clearRippleClass);

            return;
        } catch {
            root.classList.remove(themeRippleClass);
            themeRippleProperties.forEach((property) =>
                root.style.removeProperty(property),
            );
        }
    }

    root.classList.add(themeTransitionClass);
    applyTheme(appearance);
    onApplied();

    themeTransitionTimeout = window.setTimeout(() => {
        root.classList.remove(themeTransitionClass);
        themeTransitionTimeout = null;
    }, themeTransitionDuration);
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = (): void => applyTheme(currentAppearance);

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (!localStorage.getItem('appearance')) {
        localStorage.setItem('appearance', 'system');
        setCookie('appearance', 'system');
    }

    currentAppearance = getStoredAppearance();
    applyTheme(currentAppearance);

    // Set up system theme change listener
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system',
    );

    const resolvedAppearance: ResolvedAppearance = isDarkMode(appearance)
        ? 'dark'
        : 'light';

    const updateAppearance = (
        mode: Appearance,
        origin?: ThemeTransitionOrigin,
    ): void => {
        currentAppearance = mode;

        // Store in localStorage for client-side persistence...
        localStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        applyThemeWithTransition(mode, notify, origin);
    };

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
