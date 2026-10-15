import type { ComponentType } from 'react';
import AppAtlasLayout from '@/layouts/app/app-atlas-layout';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
import AppNavigatorLayout from '@/layouts/app/app-navigator-layout';
import AppRailLayout from '@/layouts/app/app-rail-layout';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import type { AppLayoutProps, PlatformTheme } from '@/types';

export const platformLayoutRegistry: Record<
    PlatformTheme,
    ComponentType<AppLayoutProps>
> = {
    canvas: AppSidebarLayout,
    atlas: AppAtlasLayout,
    rail: AppRailLayout,
    navigator: AppNavigatorLayout,
    horizon: AppHeaderLayout,
};

export const platformThemeValues = Object.keys(
    platformLayoutRegistry,
) as PlatformTheme[];
